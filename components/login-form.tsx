"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckSquare } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signIn } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#2b725e] hover:bg-[#235e4c] text-white py-6 text-lg font-medium rounded-lg h-[60px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(signIn, null)

  // Handle successful login by redirecting
  useEffect(() => {
    if (state?.success) {
      router.push("/")
    }
  }, [state, router])

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url('/green-fields-countryside.png')`,
      }}
    >
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 w-full max-w-md space-y-8 bg-black/60 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-[#2b725e] p-3 rounded-xl shadow-lg">
              <CheckSquare className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">Smart Tasks</h1>
            <p className="text-base text-gray-200 font-medium drop-shadow">from Theo Labs</p>
            <p className="text-lg text-gray-100 mt-4 drop-shadow">Welcome back! Sign in to your account</p>
          </div>
        </div>

        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded backdrop-blur-sm">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-100">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 backdrop-blur-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-100">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
              />
            </div>
          </div>

          <SubmitButton />

          <div className="space-y-3 text-center">
            <p className="text-gray-200">Don't have an account?</p>
            <Link href="/auth/sign-up">
              <Button
                variant="outline"
                className="w-full border-white/30 text-gray-100 hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm"
              >
                Create Account
              </Button>
            </Link>

            <div className="pt-2">
              <Link href="/">
                <Button variant="ghost" className="w-full text-gray-300 hover:bg-white/10 hover:text-white text-sm">
                  Continue as Guest
                </Button>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
