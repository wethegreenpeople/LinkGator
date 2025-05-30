import { Result } from 'typescript-result';
import { ThemePlugin, ThemeVariables } from '../../models/plugin_models/theme-plugin';
import { PluginType, BasePluginSettings } from '../../models/plugin_models/plugin';
import { AbstractBasePlugin } from '../../models/plugin_models/base-plugin';
import { fileURLToPath } from 'url';
import * as path from 'path';

interface LightThemeSettings extends BasePluginSettings {
  // Add any light theme specific settings here
}

export class LightThemePlugin extends AbstractBasePlugin<LightThemeSettings> implements ThemePlugin {
  id = 'light-theme';
  name = 'Light Theme';
  version = '1.0.0';
  description = 'Light theme for LinkGator following Material 3 design principles';
  pluginType = PluginType.THEME as const;

  constructor() {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    super(currentDir, { enabled: false });
  }

  getThemeVariables(): ThemeVariables {
    return {
      // Light theme Material 3 color scheme
      '--color-primary': 'oklch(0.4 0.15 240)',
      '--color-primary-light': 'oklch(0.5 0.12 240)',
      '--color-primary-dark': 'oklch(0.3 0.18 240)',
      '--color-on-primary': 'oklch(0.98 0.02 240)',
      
      '--color-secondary': 'oklch(0.45 0.1 280)',
      '--color-secondary-light': 'oklch(0.55 0.08 280)',
      '--color-secondary-dark': 'oklch(0.35 0.12 280)',
      '--color-on-secondary': 'oklch(0.98 0.02 280)',
      
      '--color-surface': 'oklch(0.98 0.005 240)',
      '--color-surface-variant': 'oklch(0.94 0.01 240)',
      '--color-surface-container': 'oklch(0.96 0.005 240)',
      '--color-surface-container-high': 'oklch(0.92 0.01 240)',
      '--color-surface-container-highest': 'oklch(0.9 0.015 240)',
      '--color-on-surface': 'oklch(0.12 0.02 240)',
      '--color-on-surface-variant': 'oklch(0.25 0.02 240)',
      
      '--color-background': 'oklch(0.99 0.002 240)',
      '--color-on-background': 'oklch(0.1 0.02 240)',
      
      '--color-outline': 'oklch(0.5 0.02 240)',
      '--color-outline-variant': 'oklch(0.75 0.02 240)',
      
      '--color-error': 'oklch(0.5 0.15 25)',
      '--color-error-container': 'oklch(0.95 0.05 25)',
      '--color-on-error': 'oklch(0.98 0.02 25)',
      '--color-on-error-container': 'oklch(0.2 0.1 25)',
      
      '--color-success': 'oklch(0.4 0.15 140)',
      '--color-success-container': 'oklch(0.9 0.05 140)',
      '--color-on-success': 'oklch(0.98 0.02 140)',
      '--color-on-success-container': 'oklch(0.15 0.1 140)',
      
      '--color-warning': 'oklch(0.45 0.15 60)',
      '--color-warning-container': 'oklch(0.9 0.05 60)',
      '--color-on-warning': 'oklch(0.98 0.02 60)',
      '--color-on-warning-container': 'oklch(0.15 0.1 60)',

      // Tailwind Color Overrides for light theme
      '--color-gray-50': 'oklch(0.99 0.005 240)',
      '--color-gray-100': 'oklch(0.97 0.005 240)',
      '--color-gray-200': 'oklch(0.93 0.005 240)',
      '--color-gray-300': 'oklch(0.85 0.01 240)',
      '--color-gray-400': 'oklch(0.65 0.01 240)',
      '--color-gray-500': 'oklch(0.5 0.01 240)',
      '--color-gray-600': 'oklch(0.4 0.015 240)',
      '--color-gray-700': 'oklch(0.3 0.02 240)',
      '--color-gray-800': 'oklch(0.2 0.02 240)',
      '--color-gray-900': 'oklch(0.12 0.02 240)',
      '--color-gray-950': 'oklch(0.08 0.02 240)',
    };
  }

  applyTheme(): Result<void, Error> {
    try {
      if (!this.isEnabled()) {
        return Result.error(new Error('Light theme plugin is not enabled'));
      }

      const variables = this.getThemeVariables();
      const root = document.documentElement;

      Object.entries(variables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      this.logger.info`Light theme applied successfully`;
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error`Failed to apply light theme: ${error}`;
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }

  removeTheme(): Result<void, Error> {
    try {
      const variables = this.getThemeVariables();
      const root = document.documentElement;

      Object.keys(variables).forEach((property) => {
        root.style.removeProperty(property);
      });

      this.logger.info`Light theme removed successfully`;
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error`Failed to remove light theme: ${error}`;
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
