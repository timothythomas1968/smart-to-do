import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof supabaseUrl === "string" &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === "string" &&
  supabaseAnonKey.length > 0

export const createClient = () => {
  if (!isSupabaseConfigured) {
    console.warn("[v0] Supabase not available, returning null client")
    return null
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = (() => {
  try {
    if (!isSupabaseConfigured) {
      console.warn("[v0] Supabase not configured, returning null client")
      return null
    }
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error("[v0] Failed to create Supabase client:", error)
    return null
  }
})()
