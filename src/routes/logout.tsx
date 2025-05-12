"use server"
import { redirect } from "@solidjs/router";
import { getAuthPlugin } from "~/utils/plugin-factory";

export async function GET() {
    // Get the auth plugin instead of direct Supabase client
    const authPlugin = getAuthPlugin();
    
    // Sign out using the plugin interface
    await authPlugin.signOut();
    
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