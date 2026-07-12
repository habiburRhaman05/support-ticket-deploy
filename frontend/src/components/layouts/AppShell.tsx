"use client"

import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  HeadphonesIcon,
  Home,
  Inbox,
  Kanban,
  LogOut,
  Store,
  UserPlus,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/hooks/auth/useAuth"
import { useMarkAllAsRead, useNotifications, useUnreadCount } from "@/hooks/query/useNotifications"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  section?: string
}

const OWNER_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Home },
  { href: "/admin/board", label: "Support board", icon: Kanban },
  { href: "/admin/review", label: "Review queue", icon: ClipboardCheck, section: "Workflow" },
  { href: "/admin/unassigned", label: "Unassigned", icon: Inbox, section: "Workflow" },
  { href: "/admin/team", label: "Team", icon: Users, section: "Manage" },
  { href: "/admin/sub-accounts", label: "Sub-accounts", icon: Store, section: "Manage" },
  { href: "/admin/requests", label: "Access requests", icon: UserPlus, section: "Manage" },
]

const TEAM_NAV: NavItem[] = [
  { href: "/team/dashboard", label: "Dashboard", icon: Home },
  { href: "/team/board", label: "My board", icon: Kanban },
]

const CLIENT_NAV: NavItem[] = [{ href: "/client/dashboard", label: "My tickets", icon: Kanban }]

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
        className="relative w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close notifications" />
          <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
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

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, logout, isOwner, isSubAccount } = useAuth()

  const nav = isSubAccount ? CLIENT_NAV : isOwner ? OWNER_NAV : TEAM_NAV
  const roleLabel = isOwner ? "Agency Owner" : isSubAccount ? "Client" : "Team Member"

  // Group nav items by section (undefined section = top ungrouped block).
  const sections: Array<{ name?: string; items: NavItem[] }> = []
  for (const item of nav) {
    const last = sections[sections.length - 1]
    if (last && last.name === item.section) last.items.push(item)
    else sections.push({ name: item.section, items: [item] })
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      {/* Expanded sidebar — light gray, GHL-style */}
      <aside className="fixed left-0 top-0 bottom-0 w-[232px] bg-[#ECEEF1] border-r border-gray-200/80 flex flex-col z-30">
        <div className="px-5 pt-6 pb-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
            <HeadphonesIcon className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[14px] font-bold text-gray-900 truncate">{user?.agencyName ?? "Support Desk"}</p>
            <p className="text-[10.5px] text-gray-400">Support Desk</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-5 overflow-y-auto pb-4">
          {sections.map((section, i) => (
            <div key={section.name ?? `top-${i}`}>
              {section.name && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{section.name}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname.startsWith(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                        active
                          ? "bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] border border-gray-200/60"
                          : "text-gray-500 hover:text-gray-900 hover:bg-white/60",
                      )}
                    >
                      <Icon className={cn("w-[17px] h-[17px] flex-shrink-0", active ? "text-gray-900" : "text-gray-400")} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User card pinned at the bottom */}
        <div className="px-3 pb-4">
          <div className="bg-white rounded-xl border border-gray-200/70 p-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {user?.initials}
            </span>
            <div className="leading-tight min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-[10.5px] text-gray-400">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              title="Sign out"
              className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 pl-[232px] min-w-0">
        <div className="px-6 py-6">
          <header className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold text-gray-900 truncate">{title}</h1>
              {subtitle && <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
              <NotificationsBell />
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
