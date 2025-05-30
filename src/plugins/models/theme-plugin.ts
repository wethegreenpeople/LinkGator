import { Plugin, PluginType } from './plugin';
import { Result } from 'typescript-result';

export interface ThemeVariables {
  [key: string]: string;
}

export interface ThemePlugin extends Plugin {
  pluginType: PluginType.THEME;
  
  getThemeVariables(): ThemeVariables;
  applyTheme(): Result<void, Error>;
  removeTheme(): Result<void, Error>;
}
