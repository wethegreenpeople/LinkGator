import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PluginManager } from "~/plugins/manager";
import { AbstractBasePlugin } from "~/plugins/models/base-plugin";
import { PluginType, BasePluginSettings } from "~/plugins/models/plugin";
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

describe("Plugin Settings Management", () => {
  let pluginManager: PluginManager;
  let testPlugin: TestPlugin;
  let tempDir: string;

  beforeEach(() => {
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
      fs.rmdirSync(tempDir);
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
