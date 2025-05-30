import { PluginManager } from '../plugins/manager';
import { ThemePlugin } from '../models/plugin_models/theme-plugin';
import { PluginType } from '../models/plugin_models/plugin';
import { Result } from 'typescript-result';
import { getLogger } from '@logtape/logtape';

class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: ThemePlugin | null = null;
  private logger = getLogger(['LinkGator', 'ThemeManager']);

  private constructor() {}

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  public getAvailableThemes(): ThemePlugin[] {
    const pluginManager = PluginManager.getInstance();
    return pluginManager.getByType<ThemePlugin>(PluginType.THEME);
  }

  public getCurrentTheme(): ThemePlugin | null {
    return this.currentTheme;
  }

  public applyTheme(themeId: string): Result<void, Error> {
    try {
      const pluginManager = PluginManager.getInstance();
      const themes = this.getAvailableThemes();
      const theme = themes.find(t => t.id === themeId);

      if (!theme) {
        return Result.error(new Error(`Theme with ID ${themeId} not found`));
      }

      if (!theme.isEnabled()) {
        return Result.error(new Error(`Theme ${themeId} is not enabled`));
      }

      // Remove current theme first
      if (this.currentTheme) {
        const removeResult = this.currentTheme.removeTheme();
        if (removeResult.isError()) {
          this.logger.warn`Failed to remove current theme: ${removeResult.error}`;
        }
      }

      // Apply new theme
      const applyResult = theme.applyTheme();
      if (applyResult.isError()) {
        return applyResult;
      }

      this.currentTheme = theme;
      this.logger.info`Applied theme: ${theme.name}`;
      
      // Store theme preference in localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('selectedTheme', themeId);
      }

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error`Error applying theme: ${error}`;
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public removeCurrentTheme(): Result<void, Error> {
    if (!this.currentTheme) {
      return Result.ok(undefined);
    }

    const result = this.currentTheme.removeTheme();
    if (result.isOk()) {
      this.currentTheme = null;
      
      // Remove theme preference from localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('selectedTheme');
      }
    }

    return result;
  }

  public initializeFromStorage(): Result<void, Error> {
    try {
      if (typeof localStorage === 'undefined') {
        return Result.ok(undefined);
      }

      const savedTheme = localStorage.getItem('selectedTheme');
      if (savedTheme) {
        return this.applyTheme(savedTheme);
      }

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error`Error initializing theme from storage: ${error}`;
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export const themeManager = ThemeManager.getInstance();
