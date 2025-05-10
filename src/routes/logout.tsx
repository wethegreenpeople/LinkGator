import { redirect } from "@solidjs/router";
import { supabase } from "~/utils/supabase";

export async function GET() {
    supabase.auth.signOut();
    return redirect("./")
}