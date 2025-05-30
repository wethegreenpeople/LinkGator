import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DarkThemePlugin } from './plugin';
import { PluginType } from '../../models/plugin_models/plugin';

// Mock DOM methods
const mockSetProperty = vi.fn();
const mockRemoveProperty = vi.fn();

Object.defineProperty(global, 'document', {
  value: {
    documentElement: {
      style: {
        setProperty: mockSetProperty,
        removeProperty: mockRemoveProperty,
      },
    },
  },
  writable: true,
});

describe('DarkThemePlugin', () => {
  let plugin: DarkThemePlugin;

  beforeEach(() => {
    plugin = new DarkThemePlugin();
    vi.clearAllMocks();
  });

  it('should have correct plugin metadata', () => {
    expect(plugin.id).toBe('dark-theme');
    expect(plugin.name).toBe('Dark Theme');
    expect(plugin.description).toBe('Dark theme for LinkGator following Material 3 design principles');
    expect(plugin.pluginType).toBe(PluginType.THEME);
    expect(plugin.version).toBe('1.0.0');
  });

  it('should return theme variables', () => {
    const variables = plugin.getThemeVariables();
    
    expect(variables).toBeDefined();
    expect(variables['--color-primary']).toBe('oklch(0.7 0.15 240)');
    expect(variables['--color-background']).toBe('oklch(0.08 0.02 240)');
    expect(variables['--color-surface']).toBe('oklch(0.12 0.02 240)');
    expect(variables['--color-on-surface']).toBe('oklch(0.92 0.02 240)');
  });
  it('should apply theme when enabled', () => {
    // Manually set enabled to true
    plugin.settings.enabled = true;
    
    const result = plugin.applyTheme();
    
    expect(result.isOk()).toBe(true);
    expect(mockSetProperty).toHaveBeenCalled();
    
    const variables = plugin.getThemeVariables();
    const callCount = Object.keys(variables).length;
    expect(mockSetProperty).toHaveBeenCalledTimes(callCount);
  });

  it('should not apply theme when disabled', () => {
    // Manually set enabled to false
    plugin.settings.enabled = false;
    
    const result = plugin.applyTheme();
    
    expect(result.isError()).toBe(true);
    expect(result.error?.message).toBe('Dark theme plugin is not enabled');
    expect(mockSetProperty).not.toHaveBeenCalled();
  });

  it('should remove theme successfully', () => {
    const result = plugin.removeTheme();
    
    expect(result.isOk()).toBe(true);
    expect(mockRemoveProperty).toHaveBeenCalled();
    
    const variables = plugin.getThemeVariables();
    const callCount = Object.keys(variables).length;
    expect(mockRemoveProperty).toHaveBeenCalledTimes(callCount);
  });
});
