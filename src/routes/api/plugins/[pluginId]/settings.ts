import { json } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";

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
    
    return json({ success: true });
  } catch (error: any) {
    console.error(`Error updating plugin settings:`, error);
    return json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
