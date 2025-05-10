"use server"
import { redirect } from "@solidjs/router";
import { supabaseServer } from "~/utils/supabase-server";

export async function GET() {
    supabaseServer.auth.signOut();
    return redirect("./")
}