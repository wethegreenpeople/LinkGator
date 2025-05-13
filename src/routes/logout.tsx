"use server"
import { redirect } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";
import { DatabasePlugin } from "~/plugins/models/database-plugin";

export async function GET() {
    const pluginManager = PluginManager.getInstance();
    
    try {
        // Wait for the plugin logout to complete
        const result = await pluginManager.executeForPlugins<DatabasePlugin, any>(
            async (plugin) => await plugin.logOutUser()
        );
        
        // Check for errors from the plugin logout
        if (result.isError()) {
            console.error('Error during logout:', result.error);
        }
        
        // Let the redirect happen naturally without manually setting cookies
        // since the Supabase plugin has already handled the cookie clearing
        return redirect('/login');
    } catch (error) {
        console.error('Unexpected error during logout:', error);
        return redirect('/login');
    }
}