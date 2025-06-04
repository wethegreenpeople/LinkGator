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

export async function POST({ request }: { request: Request }) {
  "use server";
  
  try {
    const body = await request.json();
    const { title, content, community, author, image } = body;
    
    if (!title?.trim()) {
      return json({ error: "Title is required" }, { status: 400 });
    }
    
    const pluginManager = PluginManager.getInstance();
    await PluginManager.initializePlugins();
    
    const postData = {
      content: {
        title: title.trim(),
        body: content?.trim() || null,
        author: author?.trim() || "Anonymous",
        image: image?.trim() || null,
        upvotes: 0,
        downvotes: 0,
        comments: 0
      },
      communities: {
        name: community?.trim() || "general"
      },
      created_at: new Date().toISOString()
    };
    
    const result = await pluginManager.executeForPlugins<DatabasePlugin, any>(
      async (plugin) => await plugin.createPost(postData),
      PluginType.DATABASE
    );
    
    if (result.isError()) {
      console.error('Error creating post:', result.error);
      return json({ error: "Failed to create post" }, { status: 500 });
    }
    
    return json({ success: true, post: result.value });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}
