/**
 * Core plugin system types and interfaces
 */

// Plugin types for runtime type checking
export enum PluginType {
  DATABASE = 'database'
}

// Base plugin interface that all plugins should implement
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  pluginType: PluginType | PluginType[];
}