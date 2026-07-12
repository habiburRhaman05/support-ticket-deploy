"use client"

import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCircle2, ChevronDown, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { QUERY_KEYS } from "@/constants"
import { useAuth } from "@/hooks/auth/useAuth"
import { useMarkAllAsRead, useNotifications, useUnreadCount } from "@/hooks/query/useNotifications"
import { cn } from "@/lib/utils"
import { SubAccountsService } from "@/services/subaccounts.service"
import { TicketService } from "@/services/ticket.service"

/**
 * GHL-native top-tab shell. This app is embedded inside GoHighLevel through a
 * Custom Menu Link, and the client must never feel they left GHL — so no
 * custom sidebar, no product branding: a white top tab bar, GHL's light gray
 * canvas, and white bordered cards, exactly like GHL's own Payments pages.
 */

interface NavItem {
  href: string
  label: string
  /** Key into the live counts — renders an attention badge when > 0. */
  countKey?: "review" | "unassigned" | "requests" | "myActive"
}

const OWNER_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/board", label: "Support board" },
  { href: "/admin/review", label: "Review queue", countKey: "review" },
  { href: "/admin/unassigned", label: "Unassigned", countKey: "unassigned" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/sub-accounts", label: "Sub-accounts" },
  { href: "/admin/requests", label: "Access requests", countKey: "requests" },
]

const TEAM_NAV: NavItem[] = [
  { href: "/team/dashboard", label: "Dashboard" },
  { href: "/team/board", label: "My board", countKey: "myActive" },
]

const CLIENT_NAV: NavItem[] = [{ href: "/client/dashboard", label: "My tickets" }]

/**
 * Live attention counts for the nav badges. Uses the SAME query keys as the
 * pages themselves so the cache is shared — the Review queue page and its
 * badge always agree. Polls gently so counts stay fresh while embedded.
 */
function useNavCounts(role: { isOwner: boolean; isTeamMember: boolean }) {
  const shared = { staleTime: 30_000, refetchInterval: 60_000 } as const

  const review = useQuery({
    queryKey: QUERY_KEYS.REVIEW,
    queryFn: () => TicketService.getReview(),
    enabled: role.isOwner,
    ...shared,
  })
  const unassigned = useQuery({
    queryKey: QUERY_KEYS.UNASSIGNED,
    queryFn: () => TicketService.getUnassigned(),
    enabled: role.isOwner,
    ...shared,
  })
  const requests = useQuery({
    queryKey: QUERY_KEYS.SUB_ACCOUNT_REQUESTS,
    queryFn: () => SubAccountsService.listRequests(),
    enabled: role.isOwner,
    ...shared,
  })
  const mine = useQuery({
    queryKey: QUERY_KEYS.MY_TICKETS,
    queryFn: () => TicketService.getMine(),
    enabled: role.isTeamMember,
    ...shared,
  })

  return {
    review: review.data?.length ?? 0,
    unassigned: unassigned.data?.length ?? 0,
    requests: requests.data?.length ?? 0,
    myActive: mine.data?.filter((t: { stage: string }) => t.stage !== "RESOLVED").length ?? 0,
  }
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  )
}

function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const { data: unread } = useUnreadCount()
  const { data: list } = useNotifications({ limit: 12 })
  const markAll = useMarkAllAsRead()
  const count = unread?.unreadCount ?? 0

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-[17px] h-[17px]" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close notifications" />
          <div className="absolute right-0 top-11 z-50 w-80 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!list?.notifications?.length ? (
                <div className="px-4 py-10 text-center text-sm text-gray-400">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                  All caught up
                </div>
              ) : (
                list.notifications.map((n) => (
                  <div key={n.id} className={cn("px-4 py-3 border-b border-gray-50 last:border-0", !n.isRead && "bg-blue-50/40")}>
                    <p className="text-[13px] font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function UserMenu() {
  const [open, setOpen] = useState(false)
  const { user, logout, isOwner, isSubAccount } = useAuth()
  const roleLabel = isOwner ? "Agency Owner" : isSubAccount ? "Client" : "Team Member"

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-9 pl-1.5 pr-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors"
        aria-label="Account menu"
      >
        <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-[10.5px] font-bold flex items-center justify-center">
          {user?.initials}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute right-0 top-11 z-50 w-60 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {roleLabel}
                {user?.agencyName ? ` · ${user.agencyName}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  fullWidth = false,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
  /** Board views need the whole viewport — skips the GHL content max-width. */
  fullWidth?: boolean
}) {
  const pathname = usePathname()
  const { isOwner, isTeamMember, isSubAccount } = useAuth()
  const counts = useNavCounts({ isOwner, isTeamMember })

  const nav = isSubAccount ? CLIENT_NAV : isOwner ? OWNER_NAV : TEAM_NAV

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* GHL-style top tab bar — white, full width, segmented tabs */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 h-[54px] flex items-center justify-between gap-3">
          <nav className="flex items-center overflow-x-auto py-2" aria-label="Main">
            {nav.map((item, i) => {
              const active = pathname.startsWith(item.href)
              const count = item.countKey ? counts[item.countKey] : 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center whitespace-nowrap h-9 px-3.5 text-[13px] font-medium border transition-colors -ml-px",
                    i === 0 && "ml-0 rounded-l-lg",
                    i === nav.length - 1 && "rounded-r-lg",
                    active
                      ? "text-blue-600 bg-blue-50/50 border-blue-200 relative z-10"
                      : "text-gray-600 bg-white border-gray-200 hover:text-gray-900 hover:bg-gray-50",
                  )}
                >
                  {item.label}
                  <CountBadge count={count} />
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Page canvas — GHL gray with constrained content width */}
      <div className={cn("px-4 sm:px-6 py-6", !fullWidth && "w-full mx-auto")}>
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
