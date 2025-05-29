import * as path from 'path';
import * as fs from 'fs';
import { getLogger, Logger } from '@logtape/logtape';
import { BasePluginSettings, Plugin, PluginType } from './plugin';

export abstract class AbstractBasePlugin<T extends BasePluginSettings> implements Plugin<T> {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract description: string;
  abstract pluginType: PluginType;

  public settings: T;
  protected logger: Logger;
  private pluginDirectory: string;

  constructor(pluginDirectory: string, defaultSettings: T) {
    this.pluginDirectory = pluginDirectory;
    this.settings = defaultSettings; // Initialize with default settings
    this.logger = getLogger(["LinkGator", this.constructor.name]);
    this.loadSettings(); // Load settings upon instantiation
  }

  public loadSettings(): void {
    try {
      const settingsPath = path.resolve(this.pluginDirectory, 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf-8');
        const loadedSettings = JSON.parse(settingsData) as T;
        // Merge with default settings to ensure all keys are present
        this.settings = { ...this.settings, ...loadedSettings }; 
        this.logger.debug`Loaded settings from ${settingsPath}`;
      } else {
        this.logger.warn`Settings file not found at ${settingsPath}. Using default settings.`;
        // Defaults are already set in constructor, so no change needed here if file not found
      }
    } catch (error) {
      this.logger.error`Failed to load settings: ${error}. Using default settings.`;
      // Defaults are already set, ensure we revert to them if parsing fails
      // This might involve re-assigning the initial defaultSettings if they were passed differently
      // For simplicity, we assume constructor defaults are sufficient fallback.
    }
  }

  public isEnabled(): boolean {
    // Optionally, reload settings dynamically if needed for POC, 
    // but generally settings are loaded at init or via a specific reload mechanism.
    // this.loadSettings(); 
    return this.settings.enabled;
  }
}