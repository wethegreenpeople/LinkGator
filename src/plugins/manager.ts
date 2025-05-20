import { Result } from 'typescript-result';
import { Plugin, PluginType } from './models/plugin';
import { PluginManagerError, PluginManagerErrorType } from './models/plugin-manager';
import { getLogger } from '../utils/logger';
import { DatabasePlugin } from './models/database-plugin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private static initialized = false;
  private logger = getLogger('LinkGator');
  
  private static currentFilePath = fileURLToPath(import.meta.url);
  private static currentDir = path.dirname(PluginManager.currentFilePath);

  private constructor() {}

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
      
      // Always ensure plugins are initialized when getting an instance
      // This is critical for server-side rendering where different contexts might exist
      if (!PluginManager.initialized) {
        // Call initializePlugins asynchronously, but don't wait for it
        // This is a compromise to keep the getInstance method synchronous
        PluginManager.initializePlugins().catch(error => {
          PluginManager.instance.logger.error`Failed to initialize plugins asynchronously: ${error}`;
        });
      }
    }
    return PluginManager.instance;
  }

  /**
   * Initialize the plugin manager and register core plugins.
   * This method ensures plugins are only registered once, even if called multiple times.
   */
  public static async initializePlugins(force: boolean = false): Promise<void> {
    if (PluginManager.initialized && !force) {
      PluginManager.getInstance().logger.debug`Plugins already initialized, skipping registration`;
      return;
    }

    const instance = PluginManager.getInstance();
    instance.logger.info`Initializing plugins for the first time`;
    
    try {
      // Clear plugins map to avoid any stale state
      instance.plugins.clear();
      
      // Automatically discover and register plugins
      const discoveredPlugins = await PluginManager.discoverPlugins();
      
      for (const plugin of discoveredPlugins) {
        instance.register(plugin);
      }
      
      PluginManager.initialized = true;
      instance.logger.info`Plugin initialization completed successfully with ${instance.plugins.size} plugins`;
    } catch (error) {
      instance.logger.error`Failed to initialize plugins: ${error}`;
      // Don't set initialized to true if there was an error
    }
  }

  public register<T extends Plugin>(plugin: T): void {
    if (!plugin || !plugin.id) {
      throw new PluginManagerError(
        PluginManagerErrorType.INVALID_PLUGIN,
        'Invalid plugin provided'
      );
    }

    // If plugin is already registered, log and return instead of throwing
    if (this.plugins.has(plugin.id)) {
      this.logger.warn`Plugin with ID ${plugin.id} is already registered, skipping`;
      return;
    }

    this.plugins.set(plugin.id, plugin);
    this.logger.debug`Registered plugin: ${plugin.id}`;
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
    const plugins: Plugin[] = [];
    
    try {
      if (!fs.existsSync(PluginManager.currentDir)) {
        instance.logger.error`Plugins directory not found at ${PluginManager.currentDir}`;
        return plugins;
      }
      
      // Get all subdirectories in the plugins folder
      const items = fs.readdirSync(PluginManager.currentDir);
      const dirs = items.filter(item => {
        const itemPath = path.join(PluginManager.currentDir, item);
        return fs.statSync(itemPath).isDirectory() && item !== 'models';
      });
      
      instance.logger.debug`Found ${dirs.length} potential plugin directories`;
      
      // Check each directory for a plugin.ts file
      for (const dir of dirs) {
        const pluginFilePath = path.join(PluginManager.currentDir, dir, 'plugin.ts');
        
        if (fs.existsSync(pluginFilePath)) {
          try {
            // Convert file path to URL format for import()
            const fileUrl = `file://${pluginFilePath.replace(/\\/g, '/')}`;
            
            // Dynamically import the plugin module using ESM dynamic import
            const pluginModule = await import(fileUrl);
            
            // Try to find a plugin class in the module
            let pluginInstance: Plugin | null = null;
            
            // Check default export first
            if (pluginModule.default && typeof pluginModule.default === 'function') {
              pluginInstance = new pluginModule.default();
            } 
            // Check for named exports that might be plugin classes
            else {
              for (const exportName in pluginModule) {
                if (exportName.includes('Plugin') && typeof pluginModule[exportName] === 'function') {
                  pluginInstance = new pluginModule[exportName]();
                  break;
                }
              }
            }
            
            if (pluginInstance && typeof pluginInstance.id === 'string') {
              instance.logger.info`Discovered plugin: ${pluginInstance.id} from ${dir}/plugin.ts`;
              plugins.push(pluginInstance);
            } else {
              instance.logger.warn`No valid plugin found in ${dir}/plugin.ts`;
            }
          } catch (error) {
            instance.logger.error`Failed to load plugin from ${dir}/plugin.ts: ${error}`;
          }
        } else {
          instance.logger.debug`No plugin.ts file found in ${dir}`;
        }
      }
    } catch (error) {
      instance.logger.error`Error discovering plugins: ${error}`;
    }
    
    return plugins;
  }
}