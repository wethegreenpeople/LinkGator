// ~/utils/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from "~/models/supabase"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ""
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""

// Using the browser client for client-side code
export const supabaseClient = createBrowserClient<Database>(
  supabaseUrl,
  supabaseKey
)