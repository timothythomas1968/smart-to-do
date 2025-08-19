import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendDailyDigest } from "@/lib/daily-digest-service"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get all users who have digest enabled
    const { data: users, error } = await supabase
      .from("user_settings")
      .select("user_id, digest_enabled, digest_time")
      .eq("digest_enabled", true)

    if (error) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    const results = []

    for (const user of users || []) {
      // Get user email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id)

      if (authUser.user?.email) {
        const success = await sendDailyDigest(authUser.user.email, user.user_id)
        results.push({
          userId: user.user_id,
          email: authUser.user.email,
          success,
        })
      }
    }

    return NextResponse.json({
      message: "Daily digest processing completed",
      results,
    })
  } catch (error) {
    console.error("Daily digest error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Manual trigger endpoint for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const email = searchParams.get("email")

  if (!userId || !email) {
    return NextResponse.json({ error: "Missing userId or email" }, { status: 400 })
  }

  try {
    const success = await sendDailyDigest(email, userId)
    return NextResponse.json({ success, message: success ? "Digest sent successfully" : "Failed to send digest" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 })
  }
}
