import { getLogger } from '../utils/logger';
import { DatabasePlugin } from '../models/plugin_models/database-plugin';
import { fileURLToPath } from 'url';
import { PluginManagerError, PluginManagerErrorType } from '../models/plugin_models/plugin-manager';
import { Plugin, PluginType } from '../models/plugin_models/plugin';
import { AbstractBasePlugin } from '../models/plugin_models/base-plugin';
import { Result } from 'typescript-result';
import * as fs from 'fs';
import * as path from 'path';

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private static initialized = false;
  private logger = getLogger('LinkGator');
  
  private static currentFilePath = fileURLToPath(import.meta.url);
  // Correct: currentDir should be the directory of manager.ts, which is src/plugins
  private static currentDir = path.dirname(PluginManager.currentFilePath);

  private constructor() {}

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
      if (!PluginManager.initialized) {
        PluginManager.initializePlugins().catch(error => {
          PluginManager.instance.logger.error`Failed to initialize plugins asynchronously: ${error}`;
        });
      }
    }
    return PluginManager.instance;
  }

  public static async initializePlugins(force: boolean = false): Promise<void> {
    if (PluginManager.initialized && !force) {
      PluginManager.getInstance().logger.debug`Plugins already initialized, skipping registration`;
      return;
    }

    const instance = PluginManager.getInstance();
    instance.logger.info`Initializing plugins...`;
    
    try {
      instance.plugins.clear();
      const discoveredPlugins = await PluginManager.discoverPlugins();
      for (const plugin of discoveredPlugins) {
        // The register method itself will perform the AbstractBasePlugin check
        instance.register(plugin);
      }
      PluginManager.initialized = true;
      instance.logger.info`Plugin initialization completed. Registered ${instance.plugins.size} plugins.`;
    } catch (error) {
      instance.logger.error`Failed to initialize plugins: ${error}`;
    }
  }

  public register<T extends Plugin>(plugin: T): void {
    if (!plugin || !plugin.id || !plugin.name) {
      this.logger.error`Attempted to register an invalid plugin object.`
      throw new PluginManagerError(
        PluginManagerErrorType.INVALID_PLUGIN,
        'Invalid plugin data provided (id or name missing).'
      );
    }

    if (!(plugin instanceof AbstractBasePlugin)) {
      this.logger.error`Plugin ${plugin.id} (${plugin.name}) does not extend AbstractBasePlugin. Registration aborted.`;
      throw new PluginManagerError(
        PluginManagerErrorType.INVALID_PLUGIN, // Using existing error type
        `Plugin ${plugin.id} (${plugin.name}) must extend AbstractBasePlugin.`
      );
    }

    if (this.plugins.has(plugin.id)) {
      this.logger.warn`Plugin with ID ${plugin.id} (${plugin.name}) is already registered. Skipping.`;
      return;
    }

    plugin.loadSettings(); 
    this.plugins.set(plugin.id, plugin);
    this.logger.debug`Registered plugin: ${plugin.id} (${plugin.name})`;
  }

  /**
   * Get all plugins of a specific type
   * Uses runtime type checking based on the pluginType property
   */
  public getByType<T extends Plugin>(type: PluginType): T[] {
    // Ensure plugins are initialized
    if (this.plugins.size === 0) {
      // Don't try to initialize plugins here, as it's now async
      // Just log a warning
      this.logger.warn`Attempting to get plugins before initialization is complete`;
    }
    
    // Filter plugins by type
    const filteredPlugins = Array.from(this.plugins.values())
      .filter(plugin => {
        // Handle arrays and single values
        if (Array.isArray(plugin.pluginType)) {
          return plugin.pluginType.includes(type);
        } else {
          return plugin.pluginType === type;
        }
      }) as T[];
      
    return filteredPlugins;
  }

  public getById<T extends Plugin>(id: string): T {
    const plugin = this.plugins.get(id) as T;
    
    if (!plugin) {
      throw new PluginManagerError(
        PluginManagerErrorType.PLUGIN_NOT_FOUND,
        `Plugin with ID ${id} not found`
      );
    }

    return plugin;
  }

  /**
   * Check if a plugin is registered
   */
  public has(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Unregister a plugin
   */
  public unregister(id: string): boolean {
    return this.plugins.delete(id);
  }

  /**
   * Get all registered plugins
   */
  public getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Update plugin settings
   */
  public updatePluginSettings(pluginId: string, settingKey: string, value: any): void {
    const plugin = this.getById<AbstractBasePlugin<any>>(pluginId);
    
    if (!(plugin instanceof AbstractBasePlugin)) {
      throw new PluginManagerError(
        PluginManagerErrorType.INVALID_PLUGIN,
        `Plugin ${pluginId} is not an AbstractBasePlugin`
      );
    }

    plugin.settings[settingKey] = value;
    plugin.saveSettings();
    this.logger.debug`Updated setting ${settingKey} for plugin ${pluginId}`;
  }

  /**
   * Helper that executes a callback function on multiple plugins of the same type
   * @param callback Function to execute on each plugin
   * @returns Result containing the latest successful value or errors encountered
   */
  public async executeForPlugins<T extends Plugin, R>(
    callback: (plugin: T) => Promise<Result<R, Error> | R> | Result<R, Error> | R,
    type: PluginType
  ): Promise<Result<R | null, Error[]>> {
    const plugins = this.getByType<T>(type);
    
    let latestGoodResult: R | null = null;
    const errors: Error[] = [];
    
    for (const plugin of plugins) {
      // Check isEnabled which is guaranteed by AbstractBasePlugin
      if (!plugin.isEnabled()) { 
        this.logger.debug`Plugin ${plugin.id} is disabled, skipping execution.`;
        continue;
      }
      try {
        const callbackResult = await callback(plugin);
        
        // Handle the case where the callback returns a Result type
        if (callbackResult instanceof Result) {
          if (callbackResult.isError()) {
            this.logger.error`Error from Result in plugin ${plugin.id}: ${callbackResult.error}`;
            errors.push(callbackResult.error instanceof Error ? 
              callbackResult.error : 
              new Error(String(callbackResult.error)));
            continue;
          }
          
          // Check if the value is undefined
          if (callbackResult.value === undefined) {
            this.logger.warn`Plugin ${plugin.id} returned a Result with undefined value`;
            continue;
          }
          
          latestGoodResult = callbackResult.value;
        } else {
          // Direct value returned - check if it's undefined
          if (callbackResult === undefined) {
            this.logger.warn`Plugin ${plugin.id} returned undefined value`;
            continue;
          }
          
          latestGoodResult = callbackResult;
        }
      } catch (error) {
        this.logger.error`Error executing callback on plugin ${plugin.id}: ${error}`;
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    
    if (errors.length > 0) {
      return Result.error(errors);
    }

    return Result.ok(latestGoodResult);
  }

  /**
   * Scan the plugins directory for plugin files
   * This finds all plugin.ts files in subdirectories of the plugins folder
   * @private
   */
  private static async discoverPlugins(): Promise<Plugin[]> {
    const instance = PluginManager.getInstance();
    const discovered: Plugin[] = [];
    
    const pluginsRootPath = PluginManager.currentDir; 
    instance.logger.debug`Starting plugin discovery in: ${pluginsRootPath}`;

    try {
      if (!fs.existsSync(pluginsRootPath)) {
        instance.logger.error`Plugins root directory not found at ${pluginsRootPath}`;
        return discovered;
      }
      
      const items = fs.readdirSync(pluginsRootPath, { withFileTypes: true });
      const pluginDirectories = items.filter(item => item.isDirectory() && item.name !== 'models');
      
      instance.logger.debug`Found ${pluginDirectories.length} potential plugin director(y/ies): ${pluginDirectories.map(d => d.name).join(', ')}`;
      
      for (const dirEnt of pluginDirectories) {
        const pluginDirName = dirEnt.name;
        const pluginDirPath = path.join(pluginsRootPath, pluginDirName);
        const jsPluginFilePath = path.join(pluginDirPath, 'plugin.js');
        const tsPluginFilePath = path.join(pluginDirPath, 'plugin.ts');

        let actualPluginFilePath = '';
        if (fs.existsSync(jsPluginFilePath)) {
          actualPluginFilePath = jsPluginFilePath;
        } else if (fs.existsSync(tsPluginFilePath)) {
          actualPluginFilePath = tsPluginFilePath;
        }

        if (actualPluginFilePath) {
          instance.logger.debug`Attempting to load plugin from: ${actualPluginFilePath}`;
          try {
            const fileUrl = 'file:///' + actualPluginFilePath.replace(/\\/g, '/');
            instance.logger.debug`Importing plugin module from ${fileUrl}`;
            const pluginModule = await import(fileUrl);
            instance.logger.debug`Plugin module loaded from ${actualPluginFilePath}. Exports: ${Object.keys(pluginModule).join(', ')}`;
            
            let instantiatedPlugin: any = null;

            // Try default export first
            if (pluginModule.default && typeof pluginModule.default === 'function') {
              instance.logger.debug`Considering default export from ${actualPluginFilePath}`;
              try {
                const DefaultExportedClass = pluginModule.default;
                const instanceAttempt = new DefaultExportedClass();
                // Check if it has an ID, a basic indicator of a plugin structure
                if (instanceAttempt && typeof instanceAttempt.id === 'string') {
                  instantiatedPlugin = instanceAttempt; 
                  instance.logger.debug`Default export instantiated, has ID. Will verify type.`;
                }
              } catch (e: any) {
                instance.logger.debug`Default export from ${actualPluginFilePath} could not be instantiated or is not a class: ${e.message}`;
              }
            }
            
            // If default export didn't yield a plugin, or to find a more specific one, check named exports
            if (!instantiatedPlugin || !(instantiatedPlugin instanceof AbstractBasePlugin)) {
              for (const exportName in pluginModule) {
                if (exportName === 'default') continue;

                if (typeof pluginModule[exportName] === 'function') {
                  instance.logger.debug`Considering named export '${exportName}' from ${actualPluginFilePath}`;
                  try {
                    const ExportedClass = pluginModule[exportName];
                    const instanceAttempt = new ExportedClass();
                    // Check if it has an ID
                    if (instanceAttempt && typeof instanceAttempt.id === 'string') {
                       // If this instance is an AbstractBasePlugin, it's a strong candidate
                       if (instanceAttempt instanceof AbstractBasePlugin) {
                           instantiatedPlugin = instanceAttempt;
                           instance.logger.info`Found and instantiated AbstractBasePlugin compatible named export '${exportName}'.`;
                           break; // Found a confirmed plugin
                       } else if (!instantiatedPlugin) {
                           // If no plugin found yet, keep this as a candidate
                           instantiatedPlugin = instanceAttempt;
                           instance.logger.debug`Named export '${exportName}' instantiated, has ID. Will verify type.`;
                       }
                    }
                  } catch (e: any) {
                    instance.logger.debug`Named export '${exportName}' from ${actualPluginFilePath} could not be instantiated or is not a class: ${e.message}`;
                  }
                }
              }
            }
            
            // Final check for the instantiated plugin
            if (instantiatedPlugin instanceof AbstractBasePlugin) {
              discovered.push(instantiatedPlugin as Plugin);
              instance.logger.info`Successfully discovered and validated plugin: ${(instantiatedPlugin as Plugin).id} from ${pluginDirName}`;
            } else if (instantiatedPlugin) {
              instance.logger.warn`Instantiated class from ${pluginDirName} (${instantiatedPlugin.constructor.name || 'UnknownClass'}) does not extend AbstractBasePlugin. Skipping.`;
            } else {
              instance.logger.warn`No suitable plugin class found or instantiated in ${actualPluginFilePath}.`;
            }
          } catch (error) {
            instance.logger.error`Error processing plugin file ${actualPluginFilePath}: ${error}`;
          }
        } else {
          instance.logger.debug`No plugin.js or plugin.ts found in directory ${pluginDirPath}`;
        }
      }
    } catch (error) {
      instance.logger.error`Error during plugin discovery process: ${error}`;
    }
    return discovered; // Ensure return path is always hit
  }
}