import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PluginManager } from "~/plugins/manager";
import { AbstractBasePlugin } from "~/models/plugin_models/base-plugin";
import { PluginType, BasePluginSettings, Plugin } from "~/models/plugin_models/plugin";
import { PluginManagerError, PluginManagerErrorType } from "~/models/plugin_models/plugin-manager";
import { Result } from "typescript-result";
import * as fs from "fs";
import * as path from "path";

interface TestPluginSettings extends BasePluginSettings {
  testBoolean: boolean;
  testString: string;
}

class TestPlugin extends AbstractBasePlugin<TestPluginSettings> {
  id = "test-plugin";
  name = "Test Plugin";
  version = "1.0.0";
  description = "A test plugin";
  pluginType = PluginType.DATABASE;

  constructor(pluginDirectory: string) {
    super(pluginDirectory, {
      enabled: true,
      testBoolean: false,
      testString: "default"
    });
  }
}

class TestAuthPlugin extends AbstractBasePlugin<BasePluginSettings> {
  id = "test-auth-plugin";
  name = "Test Auth Plugin";
  version = "1.0.0";
  description = "A test auth plugin";
  pluginType = PluginType.AUTH;

  constructor(pluginDirectory: string) {
    super(pluginDirectory, { enabled: true });
  }
}

class DisabledTestPlugin extends AbstractBasePlugin<BasePluginSettings> {
  id = "disabled-test-plugin";
  name = "Disabled Test Plugin";
  version = "1.0.0";
  description = "A disabled test plugin";
  pluginType = PluginType.DATABASE;

  constructor(pluginDirectory: string) {
    super(pluginDirectory, { enabled: false });
  }
}

class InvalidPlugin {
  id = "invalid-plugin";
  name = "Invalid Plugin";
  version = "1.0.0";
  description = "An invalid plugin that doesn't extend AbstractBasePlugin";
  pluginType = PluginType.DATABASE;
}

describe("PluginManager", () => {
  let pluginManager: PluginManager;
  let tempDir: string;

  beforeEach(() => {
    // Reset the singleton and initialization state
    (PluginManager as any).instance = undefined;
    (PluginManager as any).initialized = false;
    
    pluginManager = PluginManager.getInstance();
    tempDir = path.join(process.cwd(), "test-temp");
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      const settingsPath = path.join(tempDir, "settings.json");
      if (fs.existsSync(settingsPath)) {
        fs.unlinkSync(settingsPath);
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = PluginManager.getInstance();
      const instance2 = PluginManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("Plugin Registration", () => {
    it("should register a valid plugin", () => {
      const testPlugin = new TestPlugin(tempDir);
      
      pluginManager.register(testPlugin);
      
      expect(pluginManager.has("test-plugin")).toBe(true);
      expect(pluginManager.getById("test-plugin")).toBe(testPlugin);
    });

    it("should throw error for invalid plugin without id", () => {
      const invalidPlugin = { name: "Test", version: "1.0.0" } as any;
      
      expect(() => pluginManager.register(invalidPlugin)).toThrow(PluginManagerError);
      expect(() => pluginManager.register(invalidPlugin)).toThrow("Invalid plugin data provided");
    });

    it("should throw error for invalid plugin without name", () => {
      const invalidPlugin = { id: "test", version: "1.0.0" } as any;
      
      expect(() => pluginManager.register(invalidPlugin)).toThrow(PluginManagerError);
      expect(() => pluginManager.register(invalidPlugin)).toThrow("Invalid plugin data provided");
    });

    it("should throw error for plugin that doesn't extend AbstractBasePlugin", () => {
      const invalidPlugin = new InvalidPlugin() as any;
      
      expect(() => pluginManager.register(invalidPlugin)).toThrow(PluginManagerError);
      expect(() => pluginManager.register(invalidPlugin)).toThrow("must extend AbstractBasePlugin");
    });

    it("should skip registration of duplicate plugin", () => {
      const testPlugin1 = new TestPlugin(tempDir);
      const testPlugin2 = new TestPlugin(tempDir);
      
      pluginManager.register(testPlugin1);
      pluginManager.register(testPlugin2); // Should skip this
      
      expect(pluginManager.getById("test-plugin")).toBe(testPlugin1);
    });

    it("should call loadSettings on plugin registration", () => {
      const testPlugin = new TestPlugin(tempDir);
      const loadSettingsSpy = vi.spyOn(testPlugin, 'loadSettings');
      
      pluginManager.register(testPlugin);
      
      expect(loadSettingsSpy).toHaveBeenCalled();
    });
  });

  describe("Plugin Retrieval", () => {
    beforeEach(() => {
      const dbPlugin = new TestPlugin(tempDir);
      const authPlugin = new TestAuthPlugin(tempDir);
      pluginManager.register(dbPlugin);
      pluginManager.register(authPlugin);
    });

    it("should get plugin by id", () => {
      const plugin = pluginManager.getById("test-plugin");
      expect(plugin.id).toBe("test-plugin");
      expect(plugin.name).toBe("Test Plugin");
    });

    it("should throw error for non-existent plugin", () => {
      expect(() => pluginManager.getById("non-existent")).toThrow(PluginManagerError);
      expect(() => pluginManager.getById("non-existent")).toThrow("Plugin with ID non-existent not found");
    });

    it("should get plugins by type", () => {
      const dbPlugins = pluginManager.getByType(PluginType.DATABASE);
      const authPlugins = pluginManager.getByType(PluginType.AUTH);
      
      expect(dbPlugins).toHaveLength(1);
      expect(dbPlugins[0].id).toBe("test-plugin");
      expect(authPlugins).toHaveLength(1);
      expect(authPlugins[0].id).toBe("test-auth-plugin");
    });

    it("should return empty array for plugins of type with no matches", () => {
      const storagePlugins = pluginManager.getByType(PluginType.STORAGE);
      expect(storagePlugins).toHaveLength(0);
    });

    it("should get all plugins", () => {
      const allPlugins = pluginManager.getAll();
      expect(allPlugins).toHaveLength(2);
      expect(allPlugins.map(p => p.id)).toContain("test-plugin");
      expect(allPlugins.map(p => p.id)).toContain("test-auth-plugin");
    });

    it("should check if plugin exists", () => {
      expect(pluginManager.has("test-plugin")).toBe(true);
      expect(pluginManager.has("non-existent")).toBe(false);
    });
  });

  describe("Plugin Management", () => {
    it("should unregister a plugin", () => {
      const testPlugin = new TestPlugin(tempDir);
      pluginManager.register(testPlugin);
      
      expect(pluginManager.has("test-plugin")).toBe(true);
      
      const result = pluginManager.unregister("test-plugin");
      
      expect(result).toBe(true);
      expect(pluginManager.has("test-plugin")).toBe(false);
    });

    it("should return false when unregistering non-existent plugin", () => {
      const result = pluginManager.unregister("non-existent");
      expect(result).toBe(false);
    });

    it("should update plugin settings", () => {
      const testPlugin = new TestPlugin(tempDir);
      pluginManager.register(testPlugin);
      
      expect(testPlugin.settings.testBoolean).toBe(false);
      
      pluginManager.updatePluginSettings("test-plugin", "testBoolean", true);
      
      expect(testPlugin.settings.testBoolean).toBe(true);
    });

    it("should throw error when updating settings for non-AbstractBasePlugin", () => {
      // This would be hard to test without mocking, as register() already validates this
      // but we can test the error case by mocking the getById method
      const mockPlugin = { id: "mock", settings: {} } as any;
      vi.spyOn(pluginManager, 'getById').mockReturnValue(mockPlugin);
      
      expect(() => pluginManager.updatePluginSettings("mock", "key", "value"))
        .toThrow("is not an AbstractBasePlugin");
    });
  });

  describe("Plugin Execution", () => {
    beforeEach(() => {
      const enabledPlugin = new TestPlugin(tempDir);
      const disabledPlugin = new DisabledTestPlugin(tempDir);
      pluginManager.register(enabledPlugin);
      pluginManager.register(disabledPlugin);
    });    it("should execute callback on enabled plugins only", async () => {
      const callback = vi.fn().mockResolvedValue("success");
      
      const result = await pluginManager.executeForPlugins(callback, PluginType.DATABASE);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(result.isError()).toBe(false);
      expect(result.value).toBe("success");
    });

    it("should handle Result return types from callbacks", async () => {
      const callback = vi.fn().mockResolvedValue(Result.ok("result-success"));
      
      const result = await pluginManager.executeForPlugins(callback, PluginType.DATABASE);
      
      expect(result.isError()).toBe(false);
      expect(result.value).toBe("result-success");
    });

    it("should handle Result error types from callbacks", async () => {
      const callback = vi.fn().mockResolvedValue(Result.error(new Error("callback error")));
      
      const result = await pluginManager.executeForPlugins(callback, PluginType.DATABASE);
      
      expect(result.isError()).toBe(true);
      expect(result.error).toHaveLength(1);
      expect(result.error![0].message).toBe("callback error");
    });

    it("should handle exceptions thrown by callbacks", async () => {
      const callback = vi.fn().mockRejectedValue(new Error("thrown error"));
      
      const result = await pluginManager.executeForPlugins(callback, PluginType.DATABASE);
      
      expect(result.isError()).toBe(true);
      expect(result.error).toHaveLength(1);
      expect(result.error![0].message).toBe("thrown error");
    });

    it("should handle undefined return values", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      
      const result = await pluginManager.executeForPlugins(callback, PluginType.DATABASE);
      
      expect(result.isError()).toBe(false);
      expect(result.value).toBeNull();
    });

    it("should handle Result with undefined value", async () => {
      const callback = vi.fn().mockResolvedValue(Result.ok(undefined));
      
      const result = await pluginManager.executeForPlugins(callback, PluginType.DATABASE);
      
      expect(result.isError()).toBe(false);
      expect(result.value).toBeNull();
    });

    it("should return latest successful result when multiple plugins succeed", async () => {
      // Add another enabled plugin
      const anotherPlugin = new TestAuthPlugin(tempDir);
      anotherPlugin.id = "another-db-plugin";
      anotherPlugin.pluginType = PluginType.DATABASE;
      pluginManager.register(anotherPlugin);
      
      const callback = vi.fn()
        .mockResolvedValueOnce("first-result")
        .mockResolvedValueOnce("second-result");
      
      const result = await pluginManager.executeForPlugins(callback, PluginType.DATABASE);
      
      expect(result.isError()).toBe(false);
      expect(result.value).toBe("second-result");
    });

    it("should return null when no plugins are found for type", async () => {
      const callback = vi.fn();
      
      const result = await pluginManager.executeForPlugins(callback, PluginType.STORAGE);
      
      expect(callback).not.toHaveBeenCalled();
      expect(result.isError()).toBe(false);
      expect(result.value).toBeNull();
    });
  });
});

describe("Plugin Settings Management", () => {
  let pluginManager: PluginManager;
  let testPlugin: TestPlugin;
  let tempDir: string;

  beforeEach(() => {
    // Reset the singleton and initialization state
    (PluginManager as any).instance = undefined;
    (PluginManager as any).initialized = false;
    
    pluginManager = PluginManager.getInstance();
    tempDir = path.join(process.cwd(), "test-temp");
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    testPlugin = new TestPlugin(tempDir);
    pluginManager.register(testPlugin);
  });
  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      const settingsPath = path.join(tempDir, "settings.json");
      if (fs.existsSync(settingsPath)) {
        fs.unlinkSync(settingsPath);
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should update boolean settings", () => {
    expect(testPlugin.settings.testBoolean).toBe(false);
    
    pluginManager.updatePluginSettings("test-plugin", "testBoolean", true);
    
    expect(testPlugin.settings.testBoolean).toBe(true);
  });

  it("should persist settings to file", () => {
    pluginManager.updatePluginSettings("test-plugin", "testBoolean", true);
    
    const settingsPath = path.join(tempDir, "settings.json");
    expect(fs.existsSync(settingsPath)).toBe(true);
    
    const savedSettings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    expect(savedSettings.testBoolean).toBe(true);
  });

  it("should load saved settings on plugin initialization", () => {
    const settingsPath = path.join(tempDir, "settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify({ 
      enabled: true, 
      testBoolean: true, 
      testString: "modified" 
    }));
    
    const newPlugin = new TestPlugin(tempDir);
    expect(newPlugin.settings.testBoolean).toBe(true);
    expect(newPlugin.settings.testString).toBe("modified");
  });
});
