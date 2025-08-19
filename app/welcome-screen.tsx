"use client"

import { CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WelcomeScreenProps {
  onGuestMode: () => void
  onSignIn: () => void
  onSignUp: () => void
}

export default function WelcomeScreen({ onGuestMode, onSignIn, onSignUp }: WelcomeScreenProps) {
  const handleGuestClick = () => {
    console.log("[v0] Continue as Guest button clicked in WelcomeScreen")
    try {
      onGuestMode()
      console.log("[v0] onGuestMode function called successfully")
    } catch (error) {
      console.log("[v0] Error calling onGuestMode:", error)
    }
  }

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
            <p className="text-lg text-gray-100 mt-4 drop-shadow">Welcome! Choose how you'd like to continue</p>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={onSignIn}
            className="w-full bg-[#2b725e] hover:bg-[#235e4c] text-white py-6 text-lg font-medium rounded-lg h-[60px]"
          >
            Sign In
          </Button>

          <Button
            onClick={onSignUp}
            variant="outline"
            className="w-full border-white/30 text-gray-100 hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm py-6 text-lg font-medium rounded-lg h-[60px]"
          >
            Create Account
          </Button>

          <Button
            onClick={handleGuestClick}
            variant="ghost"
            className="w-full text-gray-200 hover:bg-white/10 hover:text-white py-6 text-lg font-medium rounded-lg h-[60px]"
          >
            Continue as Guest
          </Button>
        </div>
      </div>
    </div>
  )
}
