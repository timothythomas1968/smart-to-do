"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { updatePassword } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating...
        </>
      ) : (
        "Update Password"
      )}
    </Button>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [state, formAction] = useActionState(updatePassword, null)

  // Redirect to login after successful password update
  useEffect(() => {
    if (state?.success) {
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
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
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">Reset Password</h1>
            <p className="text-base text-gray-200 font-medium drop-shadow">from Theo Labs</p>
            <p className="text-lg text-gray-100 mt-4 drop-shadow">Enter your new password</p>
          </div>
        </div>

        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded backdrop-blur-sm">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-100 px-4 py-3 rounded backdrop-blur-sm">
              {state.success}. Redirecting to login...
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-gray-100">
                New Password
              </Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
                placeholder="Enter your new password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 backdrop-blur-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-100">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                placeholder="Confirm your new password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 backdrop-blur-sm"
              />
            </div>
          </div>

          <SubmitButton />

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/auth/login")}
              className="text-gray-300 hover:text-white"
            >
              Back to Sign In
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
