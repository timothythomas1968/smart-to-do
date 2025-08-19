"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

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

  const supabase = createSupabaseServerClient()

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

  const supabase = createSupabaseServerClient()

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
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}

export async function resetPassword(prevState: any, formData: FormData) {
  console.log("[v0] Password reset attempt started")

  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")

  if (!email) {
    return { error: "Email is required" }
  }

  const supabase = createSupabaseServerClient()

  try {
    console.log("[v0] Attempting password reset for:", email)
    const { error } = await supabase.auth.resetPasswordForEmail(email.toString(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password`,
    })

    if (error) {
      console.log("[v0] Password reset error:", error.message)
      return { error: error.message }
    }

    console.log("[v0] Password reset email sent successfully")
    return { success: "Password reset email sent. Check your inbox for instructions." }
  } catch (error: any) {
    console.error("[v0] Password reset error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function changePassword(prevState: any, formData: FormData) {
  console.log("[v0] Change password attempt started")

  if (!formData) {
    return { error: "Form data is missing" }
  }

  const currentPassword = formData.get("currentPassword")
  const newPassword = formData.get("newPassword")
  const confirmPassword = formData.get("confirmPassword")

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required" }
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" }
  }

  if (newPassword.toString().length < 6) {
    return { error: "New password must be at least 6 characters long" }
  }

  const supabase = createSupabaseServerClient()

  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user?.email) {
      return { error: "User not authenticated" }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.user.email,
      password: currentPassword.toString(),
    })

    if (signInError) {
      return { error: "Current password is incorrect" }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.toString(),
    })

    if (updateError) {
      console.log("[v0] Password update error:", updateError.message)
      return { error: updateError.message }
    }

    console.log("[v0] Password changed successfully")
    return { success: "Password changed successfully" }
  } catch (error: any) {
    console.error("[v0] Change password error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function updatePassword(prevState: any, formData: FormData) {
  console.log("[v0] Update password attempt started")

  if (!formData) {
    return { error: "Form data is missing" }
  }

  const newPassword = formData.get("newPassword")
  const confirmPassword = formData.get("confirmPassword")

  if (!newPassword || !confirmPassword) {
    return { error: "Both password fields are required" }
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" }
  }

  if (newPassword.toString().length < 6) {
    return { error: "Password must be at least 6 characters long" }
  }

  const supabase = createSupabaseServerClient()

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.toString(),
    })

    if (error) {
      console.log("[v0] Password update error:", error.message)
      return { error: error.message }
    }

    console.log("[v0] Password updated successfully")
    return { success: "Password updated successfully" }
  } catch (error: any) {
    console.error("[v0] Update password error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}
