import { json } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";
import { ThemePlugin } from "~/plugins/models/theme-plugin";
import { PluginType } from "~/plugins/models/plugin";

export async function GET() {
  "use server";
  
  try {
    const pluginManager = PluginManager.getInstance();
    await PluginManager.initializePlugins();
    
    const themePlugins = pluginManager.getByType<ThemePlugin>(PluginType.THEME);
    
    const themes = themePlugins.map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      enabled: plugin.isEnabled()
    }));
    
    return json({ themes });
  } catch (error: any) {
    console.error('Error fetching themes:', error);
    return json({ error: error.message || "Failed to fetch themes" }, { status: 500 });
  }
}
