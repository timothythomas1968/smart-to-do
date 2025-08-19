"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, LogOut, LogIn, UserPlus, Key, Loader2 } from "lucide-react"
import { signOut, changePassword } from "@/lib/actions"
import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"

interface AuthMenuProps {
  user: any
}

function ChangePasswordSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Changing...
        </>
      ) : (
        "Change Password"
      )}
    </Button>
  )
}

export default function AuthMenu({ user }: AuthMenuProps) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [changePasswordState, changePasswordAction] = useActionState(changePassword, null)

  // Reset form state when dialog closes
  const handleDialogClose = () => {
    setIsChangePasswordOpen(false)
    // Reset form state by clearing the action state
    if (changePasswordState?.success) {
      window.location.reload() // Refresh to clear state
    }
  }

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="bg-white/80 backdrop-blur-sm border-white/20">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Guest Mode</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/auth/login" className="flex items-center gap-2 cursor-pointer">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/auth/sign-up" className="flex items-center gap-2 cursor-pointer">
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Authenticated user - show user menu with logout and change password
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="bg-white/80 backdrop-blur-sm border-white/20">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">{user.email}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
            <Key className="h-4 w-4 mr-2" />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action={signOut} className="w-full">
              <button type="submit" className="flex items-center gap-2 w-full text-left">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isChangePasswordOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form action={changePasswordAction} className="space-y-4">
            {changePasswordState?.error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded">
                {changePasswordState.error}
              </div>
            )}

            {changePasswordState?.success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded">
                {changePasswordState.success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                placeholder="Enter your current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                placeholder="Enter your new password"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="Confirm your new password"
                minLength={6}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <ChangePasswordSubmitButton />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
