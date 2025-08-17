import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse, type NextRequest } from "next/server"

const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export async function middleware(request: NextRequest) {
  // If Supabase is not configured, allow guest access
  if (!isSupabaseConfigured) {
    return NextResponse.next({
      request,
    })
  }

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Check if this is an auth callback
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Refresh session if expired
  await supabase.auth.getSession()

  // Allow access to auth routes and guest mode
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth/") || request.nextUrl.pathname === "/"

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
