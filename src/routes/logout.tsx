"use server"
import { redirect } from "@solidjs/router";
import { createServerSupabase } from "~/utils/supabase-server";

export async function GET() {
    // Use the server-side client with cookie handling
    const supabase = createServerSupabase();
    
    // Sign out
    await supabase.auth.signOut();
    
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