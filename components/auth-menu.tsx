"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, LogIn, UserPlus } from "lucide-react"
import { signOut } from "@/lib/actions"
import Link from "next/link"

interface AuthMenuProps {
  user: any
}

export default function AuthMenu({ user }: AuthMenuProps) {
  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-accent hover:text-accent-foreground px-4 py-2 h-auto"
          >
            <User className="h-4 w-4 mr-2" />
            Sign-in / Sign-up
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

  // Authenticated user - show user menu with logout
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-accent hover:text-accent-foreground px-4 py-2 h-auto"
        >
          <User className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">{user.email}</div>
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
  )
}
