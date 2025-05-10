import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/models/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);