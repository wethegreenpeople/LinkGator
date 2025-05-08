"use server"

import { createClient } from "@supabase/supabase-js";
import { Database } from "~/models/supabase";
import '@dotenvx/dotenvx/config'

const supabaseUrl: string = process.env.SUPABASE_URL ?? "";
const supabaseKey: string = process.env.SUPABASE_ANON_KEY ?? "";

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);