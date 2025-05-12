import { Result } from 'typescript-result';
import { SupabaseDatabasePlugin } from './supabase/plugin';
import { MongoDBDatabasePlugin } from './mongodb/plugin';
import { Plugin } from './models/plugin';
import { PluginManagerError, PluginManagerErrorType } from './models/plugin-manager';
import { getLogger } from '../utils/logger';

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private static initialized = false;
  private logger = getLogger('PluginManager');

  private constructor() {}

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Initialize the plugin manager and register core plugins.
   * This method ensures plugins are only registered once, even if called multiple times.
   */
  public static initializePlugins(): void {
    if (PluginManager.initialized) {
      PluginManager.getInstance().logger.debug`Plugins already initialized, skipping registration`;
      return;
    }

    const instance = PluginManager.getInstance();
    instance.logger.info`Initializing plugins for the first time`;
    
    try {
      instance.register(new SupabaseDatabasePlugin());
      
      PluginManager.initialized = true;
      instance.logger.info`Plugin initialization completed successfully`;
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

  public getByType<T extends Plugin>(): T[] {
    return Array.from(this.plugins.values()).filter(
      (plugin): plugin is T => true
    );
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
    callback: (plugin: T) => Promise<Result<R, Error> | R> | Result<R, Error> | R
  ): Promise<Result<R | null, Error[]>> {
    const plugins = this.getByType<T>();
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
}