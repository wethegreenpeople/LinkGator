import { json, revalidate } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";
import { ClientPluginExecutor } from "~/utils/client-plugin-executor";

export async function POST({ params, request }: { params: { pluginId: string }, request: Request }) {
  "use server";
  
  try {
    const { settingKey, value } = await request.json();
    
    if (!settingKey || value === undefined) {
      return json({ error: "Missing settingKey or value" }, { status: 400 });
    }

    const pluginManager = PluginManager.getInstance();
    await PluginManager.initializePlugins(); // Ensure plugins are initialized
    pluginManager.updatePluginSettings(params.pluginId, settingKey, value);
    
    // Invalidate the ClientPluginExecutor cache to ensure fresh data
    ClientPluginExecutor.getInstance().invalidateCache();
    
    // Revalidate the plugin content query to refresh the UI
    revalidate("plugin-content");
    
    return json({ success: true });
  } catch (error: any) {
    console.error(`Error updating plugin settings:`, error);
    return json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
