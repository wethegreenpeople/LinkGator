import { describe, it, expect, beforeEach } from "vitest";
import { LightThemePlugin } from "~/plugins/light-theme/plugin";
import { PluginType } from "~/models/plugin_models/plugin";
import * as path from "path";

describe("LightThemePlugin", () => {
  let plugin: LightThemePlugin;
  
  beforeEach(() => {
    plugin = new LightThemePlugin();
  });

  it("should have correct plugin metadata", () => {
    expect(plugin.id).toBe('light-theme');
    expect(plugin.name).toBe('Light Theme');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.description).toContain('Light theme');
    expect(plugin.pluginType).toBe(PluginType.THEME);
  });

  it("should return light theme variables", () => {
    const variables = plugin.getThemeVariables();
    
    expect(variables).toHaveProperty('--color-background');
    expect(variables).toHaveProperty('--color-surface');
    expect(variables).toHaveProperty('--color-primary');
    
    // Light theme should have light background
    expect(variables['--color-background']).toContain('0.99');
    // And dark text
    expect(variables['--color-on-background']).toContain('0.1');
  });
});
