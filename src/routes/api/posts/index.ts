import { json } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";
import { DatabasePlugin } from "~/models/plugin_models/database-plugin";
import { PluginType } from "~/models/plugin_models/plugin";
import { Post } from "~/models/post";

export async function GET() {
  "use server";
  
  try {
    const pluginManager = PluginManager.getInstance();
    await PluginManager.initializePlugins();
    
    const databasePlugin = pluginManager.getByType<DatabasePlugin>(PluginType.DATABASE);
    
    if (!databasePlugin) {
      return json({ error: "Database plugin not found" }, { status: 500 });
    }
      
    
    const result = await pluginManager.executeForPlugins<DatabasePlugin, Post[]>((plugin) => plugin.getAllPosts(), PluginType.DATABASE);
    
    if (result.isError()) {
      console.error('Error fetching posts:', result.error);
      return json({ error: result.error[0]?.message || "Failed to fetch posts" }, { status: 500 });
    }
    
    return json({ posts: result.value });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return json({ error: error.message || "Failed to fetch posts" }, { status: 500 });
  }
}
