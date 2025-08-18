"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

async function retryWithBackoff<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      const isNetworkError =
        error?.message?.includes("Failed to fetch") ||
        error?.message?.includes("Network Error") ||
        error?.name === "TypeError"

      if (attempt === maxRetries || !isNetworkError) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`[v0] Network error on attempt ${attempt}, retrying in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error("Max retries exceeded")
}

export async function signIn(prevState: any, formData: FormData) {
  console.log("[v0] Sign-in attempt started")

  if (!formData) {
    console.log("[v0] Sign-in failed: Form data is missing")
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    console.log("[v0] Sign-in failed: Email and password are required")
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )

  try {
    console.log("[v0] Attempting Supabase sign-in for:", email)

    const { error } = await retryWithBackoff(async () => {
      return await supabase.auth.signInWithPassword({
        email: email.toString(),
        password: password.toString(),
      })
    })

    if (error) {
      console.log("[v0] Supabase sign-in error:", error.message)
      return { error: error.message }
    }

    console.log("[v0] Sign-in successful")
  } catch (error: any) {
    console.error("[v0] Sign-in network error:", error.message || error)
    if (error?.message?.includes("Failed to fetch")) {
      return { error: "Network connection issue. Please check your internet connection and try again." }
    }
    return { error: "An unexpected error occurred. Please try again." }
  }

  redirect("/")
}

export async function signUp(prevState: any, formData: FormData) {
  console.log("[v0] Sign-up attempt started")

  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )

  try {
    console.log("[v0] Clearing existing session before sign-up")
    await supabase.auth.signOut()

    console.log("[v0] Attempting Supabase sign-up for:", email)
    const { error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}`,
      },
    })

    if (error) {
      console.log("[v0] Supabase sign-up error:", error.message)
      if (error.message.includes("Invalid Refresh Token") || error.message.includes("Refresh Token Not Found")) {
        console.log("[v0] Refresh token error detected, clearing session and retrying")
        await supabase.auth.signOut()
        return { error: "Session expired. Please try signing up again." }
      }
      return { error: error.message }
    }

    console.log("[v0] Sign-up successful")
    return { success: "Check your email to confirm your account." }
  } catch (error: any) {
    console.error("[v0] Sign up error:", error)
    if (error?.message?.includes("Invalid Refresh Token") || error?.message?.includes("Refresh Token Not Found")) {
      console.log("[v0] Refresh token error in catch block, clearing session")
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.error("[v0] Error clearing session:", signOutError)
      }
      return { error: "Session expired. Please try signing up again." }
    }
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )

  await supabase.auth.signOut()
  redirect("/auth/login")
}
