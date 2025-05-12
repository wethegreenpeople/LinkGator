"use server"
import { redirect } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";
import { DatabasePlugin } from "~/plugins/models/database-plugin";

export async function GET() {
    const pluginManager = PluginManager.getInstance();
    pluginManager.executeForPlugins<DatabasePlugin, any>(async (plugin) => await plugin.logOutUser());
    
    // Create a response that explicitly clears the auth cookies
    const response = new Response(null, {
        status: 303, // Redirect status
        headers: {
            "Location": "/login",
            "Set-Cookie": "sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax, sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
        }
    });
    
    return response;
}