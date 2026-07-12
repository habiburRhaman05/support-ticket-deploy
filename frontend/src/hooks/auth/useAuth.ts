"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import { QUERY_KEYS, ROUTES } from "@/constants"
import { tokenStorage } from "@/lib/token-storage"
import { AuthService } from "@/services/auth.service"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { logout, patchUser, setLoading, setUser } from "@/store/slices/auth.slice"
import type { User, UserRole } from "@/types"

/** Where each role lands after authenticating — strict per-role areas. */
export function homeRouteFor(role: UserRole): string {
  if (role === "SUB_ACCOUNT") return ROUTES.CLIENT_DASHBOARD
  if (role === "TEAM_MEMBER") return ROUTES.TEAM_DASHBOARD
  return ROUTES.ADMIN_DASHBOARD
}

export function useAuth() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  const token = typeof window !== "undefined" ? tokenStorage.getAccessToken() : undefined

  const { data: me, isError: meError } = useQuery({
    queryKey: QUERY_KEYS.AUTH.ME,
    queryFn: async () => {
      const userData = await AuthService.getMe()
      dispatch(setUser(userData))
      return userData
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (meError) {
      tokenStorage.clear()
      dispatch(logout())
    }
  }, [meError, dispatch])

  const login = useCallback(
    async (email: string, password: string) => {
      dispatch(setLoading(true))
      try {
        const data = await AuthService.login(email, password)
        tokenStorage.setTokens(data.accessToken, data.refreshToken)
        dispatch(setUser(data.user))
        // Team members on a temporary password must set a new one (and read the
        // onboarding brief) before they can reach their dashboard.
        if (data.user.tempPassword && data.user.role === "TEAM_MEMBER") {
          toast.success("Welcome! Let's set up your account.")
          router.push(ROUTES.ONBOARDING)
        } else {
          toast.success(`Welcome back, ${data.user.name}!`)
          router.push(homeRouteFor(data.user.role))
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.error?.message || "Invalid email or password"
        toast.error(message)
        throw error
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch, router],
  )

  /** First-time agency owner connect (email + password + Company ID + GHL key). */
  const connect = useCallback(
    async (params: {
      agencyName: string
      email: string
      password: string
      ghlCompanyId: string
      ghlApiKey: string
    }) => {
      dispatch(setLoading(true))
      try {
        const data = await AuthService.connect(params)
        tokenStorage.setTokens(data.accessToken, data.refreshToken)
        dispatch(setUser(data.user))
        toast.success("Agency connected successfully!")
        router.push(ROUTES.ADMIN_DASHBOARD)
      } catch (error: any) {
        const message =
          error?.response?.data?.error?.message ||
          "Connection failed. Please check your details and try again."
        toast.error(message)
        throw error
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch, router],
  )

  /** Used by the /portal flow once the backend has issued a sub-account session. */
  const adoptSession = useCallback(
    (sessionUser: User, accessToken: string, refreshToken: string) => {
      tokenStorage.setTokens(accessToken, refreshToken)
      dispatch(setUser(sessionUser))
    },
    [dispatch],
  )

  const logoutUser = useCallback(async () => {
    tokenStorage.clear()
    dispatch(logout())
    toast.success("Signed out successfully")
    router.push(ROUTES.LOGIN)
  }, [dispatch, router])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await AuthService.changePassword(currentPassword, newPassword)
        toast.success("Password changed successfully")
        return true
      } catch (error: any) {
        const message =
          error?.response?.data?.error?.message || "Failed to change password"
        toast.error(message)
        throw error
      }
    },
    [],
  )

  /** Completes first-login setup: sets a real password, clearing tempPassword. */
  const firstLoginPassword = useCallback(
    async (newPassword: string) => {
      await AuthService.firstLoginPassword(newPassword)
      dispatch(patchUser({ tempPassword: false }))
    },
    [dispatch],
  )

  const isOwner = user?.role === "AGENCY_OWNER"
  const isTeamMember = user?.role === "TEAM_MEMBER"
  const isSubAccount = user?.role === "SUB_ACCOUNT"

  return {
    user: user ?? me ?? undefined,
    isAuthenticated: isAuthenticated || !!me,
    isLoading,
    isOwner,
    isTeamMember,
    isSubAccount,
    login,
    connect,
    adoptSession,
    logout: logoutUser,
    changePassword,
    firstLoginPassword,
  }
}
