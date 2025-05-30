/**
 * Core plugin system types and interfaces
 */

// Plugin types for runtime type checking
export enum PluginType {
  AUTH = 'auth',
  DATABASE = 'database',
  STORAGE = 'storage',
  THEME = 'theme',
  CLIENT = 'client'
}

// Added: Base settings interface
export interface BasePluginSettings {
  enabled: boolean;
}

export interface Plugin<T extends BasePluginSettings = BasePluginSettings> {
  id: string;
  name: string;
  version: string;
  description: string;
  pluginType: PluginType;
  settings: T; // Use generic type for settings

  loadSettings(): void;
  isEnabled(): boolean;
}