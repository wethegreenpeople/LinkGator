import { json } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";
import { ThemePlugin } from "~/plugins/models/theme-plugin";
import { PluginType } from "~/plugins/models/plugin";

export async function GET(event: any) {
  "use server";
  
  try {
    const themeId = event.params.themeId;
    
    const pluginManager = PluginManager.getInstance();
    await PluginManager.initializePlugins();
    
    const themePlugins = pluginManager.getByType<ThemePlugin>(PluginType.THEME);
    const theme = themePlugins.find(plugin => plugin.id === themeId);
    
    if (!theme) {
      return json({ error: "Theme not found" }, { status: 404 });
    }
    
    if (!theme.isEnabled()) {
      return json({ error: "Theme is not enabled" }, { status: 400 });
    }
    
    const variables = theme.getThemeVariables();
    
    return json({ variables });
  } catch (error: any) {
    console.error('Error fetching theme variables:', error);
    return json({ error: error.message || "Failed to fetch theme variables" }, { status: 500 });
  }
}
