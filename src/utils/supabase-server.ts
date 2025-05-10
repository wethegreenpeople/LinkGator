"use server"

import { createClient } from "@supabase/supabase-js";
import { Database } from "~/models/supabase";
import '@dotenvx/dotenvx/config'

const supabaseUrl: string = process.env.VITE_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseServer = createClient<Database>(supabaseUrl, supabaseServiceKey);