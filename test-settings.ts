import { PluginManager } from "~/plugins/manager";

async function testSettingsPersistence() {
  console.log("Testing settings persistence...");
  
  // Initialize plugins
  await PluginManager.initializePlugins();
  const pluginManager = PluginManager.getInstance();
  
  // Get the light theme plugin
  const lightTheme = pluginManager.getById('light-theme');
  console.log("Light theme before update:", lightTheme.settings);
  
  // Try updating the setting
  try {
    pluginManager.updatePluginSettings('light-theme', 'enabled', true);
    console.log("Light theme after update:", lightTheme.settings);
    
    // Check if settings were persisted
    const updatedTheme = pluginManager.getById('light-theme');
    console.log("Light theme from manager:", updatedTheme.settings);
    
  } catch (error) {
    console.error("Error updating settings:", error);
  }
}

testSettingsPersistence();
