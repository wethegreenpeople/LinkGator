"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { Database } from "~/models/supabase"
import { getRequestEvent } from 'solid-js/web'
import '@dotenvx/dotenvx/config'
import { type FetchEvent } from "@solidjs/start/server"

const supabaseUrl: string = process.env.VITE_SUPABASE_URL ?? ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? ""

export const supabaseService = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey
)

export function createServerSupabase() {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        // Get all cookies from the request
        getAll() {
          const cookies = parseCookieHeader(getRequestEvent()?.request.headers.get('Cookie') ?? '')
          return cookies.filter(cookie => cookie.value !== undefined) as { name: string; value: string }[]
        },
        // Set all cookies on the response
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            getRequestEvent()?.response.headers.append(
              'Set-Cookie', 
              serializeCookieHeader(name, value, options)
            )
          })
        },
      },
    }
  )
}

// For middleware contexts where you have the event object
export function createServerSupabaseClient(event: FetchEvent) {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          const cookies = parseCookieHeader(event.request.headers.get('Cookie') ?? '')
          return cookies.filter(cookie => cookie.value !== undefined) as { name: string; value: string }[]
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (event.response) {
              event.response.headers.append(
                'Set-Cookie', 
                serializeCookieHeader(name, value, options)
              )
            }
          })
        },
      },
    }
  )
}