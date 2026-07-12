"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { ROUTES } from "@/constants"
import { homeRouteFor, useAuth } from "@/hooks/auth/useAuth"
import type { UserRole } from "@/types"

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  /** Where to send unauthenticated visitors (sub-account pages use /portal). */
  redirectTo?: string
}

export function AuthGuard({ children, allowedRoles, redirectTo = ROUTES.LOGIN }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // A team member still on a temporary password is forced through onboarding
  // (set a real password) before any other authenticated page will render.
  const mustOnboard =
    isAuthenticated &&
    user?.role === "TEAM_MEMBER" &&
    user?.tempPassword === true &&
    pathname !== ROUTES.ONBOARDING

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isLoading, isAuthenticated, router, redirectTo])

  useEffect(() => {
    if (!isLoading && mustOnboard) {
      router.push(ROUTES.ONBOARDING)
    }
  }, [isLoading, mustOnboard, router])

  useEffect(() => {
    // Authenticated but wrong role for this area — send them to their own home.
    if (
      !isLoading &&
      isAuthenticated &&
      allowedRoles &&
      user &&
      !allowedRoles.includes(user.role)
    ) {
      router.push(homeRouteFor(user.role))
    }
  }, [isLoading, isAuthenticated, allowedRoles, user, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null
  }

  // Block content while we bounce them to onboarding.
  if (mustOnboard) {
    return null
  }

  return <>{children}</>
}
