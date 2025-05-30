import { describe, it, expect, beforeEach, vi } from "vitest";
import { themeManager } from "~/utils/theme-manager";
import { PluginManager } from "~/plugins/manager";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

// Mock window object with localStorage
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock
  },
  writable: true
});

// Also mock global localStorage
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock document.documentElement
const mockRootElement = {
  style: {
    setProperty: vi.fn(),
    removeProperty: vi.fn()
  }
};

Object.defineProperty(global, 'document', {
  value: {
    documentElement: mockRootElement
  },
  writable: true
});

describe("ThemeManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset plugin manager
    (PluginManager as any).instance = undefined;
    (PluginManager as any).initialized = false;
    // Reset theme manager singleton
    (themeManager as any).currentTheme = null;
  });

  it("should get available themes", async () => {
    await PluginManager.initializePlugins();
    const themes = themeManager.getAvailableThemes();
    
    expect(themes.length).toBeGreaterThan(0);
    const lightTheme = themes.find(t => t.id === 'light-theme');
    expect(lightTheme).toBeDefined();
    expect(lightTheme?.name).toBe('Light Theme');
  });
  it("should apply theme when enabled", async () => {
    await PluginManager.initializePlugins();
    
    // Enable the light theme first
    const pluginManager = PluginManager.getInstance();
    pluginManager.updatePluginSettings('light-theme', 'enabled', true);
    
    const result = themeManager.applyTheme('light-theme');
    
    expect(result.isOk()).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('selectedTheme', 'light-theme');
    expect(mockRootElement.style.setProperty).toHaveBeenCalledWith('--color-primary', expect.any(String));
  });

  it("should not apply disabled theme", async () => {
    await PluginManager.initializePlugins();
    
    // Disable the theme
    const pluginManager = PluginManager.getInstance();
    pluginManager.updatePluginSettings('light-theme', 'enabled', false);
    
    const result = themeManager.applyTheme('light-theme');
    
    expect(result.isError()).toBe(true);
    expect(result.error?.message).toContain('not enabled');
  });
  it("should remove current theme", async () => {
    await PluginManager.initializePlugins();
    
    // Enable the light theme first
    const pluginManager = PluginManager.getInstance();
    pluginManager.updatePluginSettings('light-theme', 'enabled', true);
    
    // First apply a theme
    const applyResult = themeManager.applyTheme('light-theme');
    expect(applyResult.isOk()).toBe(true);
    
    // Then remove it
    const result = themeManager.removeCurrentTheme();
    
    expect(result.isOk()).toBe(true);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('selectedTheme');
    expect(mockRootElement.style.removeProperty).toHaveBeenCalledWith('--color-primary');
  });
  it("should initialize from localStorage", async () => {
    await PluginManager.initializePlugins();
    
    // Enable the light theme first
    const pluginManager = PluginManager.getInstance();
    pluginManager.updatePluginSettings('light-theme', 'enabled', true);
    
    localStorageMock.getItem.mockReturnValue('light-theme');
    
    const result = themeManager.initializeFromStorage();
    
    expect(result.isOk()).toBe(true);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('selectedTheme');
  });
});
