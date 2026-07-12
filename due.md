Correct — 4 phases due: 3, 4, 5, 6. Phases 1 and 2 are done and tested. And yes, honestly assessed: completing those 4 phases delivers everything in your specs — connect flow, approval gate, full ticket workflow, client experience, agency operations, and production hardening. Nothing from main-goal.md or first phase.md is left out; the only "optional" items are the ones your own spec marked as nice-to-have (WebSockets live sync, canned responses, 2FA).

Final corrected plan
Phase 3 — Role separation + workflow correctness (starts on your go)

Strict role-locked routes: /admin/* owner-only, /team/* for team members, /client/dashboard for sub-accounts, /portal stays the public entrance door
Login redirects each role to its own home; wrong-role visits bounce — zero role-access compromise, enforced on both frontend guards and backend API
Mandatory comment modal on every stage move (dedicated modal: stage color, editable comment, email toggle) — no comment, no move
Proper loading UI during drag/move (spinner overlay on card, disabled controls until server confirms)
Remove "New ticket" for team members — UI removed and backend blocks it
Seed manually-verified sub-account for testing without GHL API
Expanded sidebar + UI upgrade (details below)
Full role-matrix E2E test before I call it done
Phase 4 — Client experience: attachments (upload + preview on tickets/replies), real email delivery (you pick: SendGrid / SES / Postmark — I'll recommend when we get there), forced password change on first team-member login

Phase 5 — Agency operations: SLA timers with at-risk/overdue flags + owner alerts, CSAT after resolution, reports (resolution times, agent scorecards, CSV export), global search, editable stage names/colors, email template editor

Phase 6 — Production readiness: git repo first, real GHL token verification + your real connect, deployment setup, iframe test inside real GHL, final security audit

UI improvement plan (inside Phase 3)
Expanded sidebar — icons + labels (not icon-only), light gray background like GHL's own left nav, active item clearly highlighted, section grouping, user card pinned at bottom
GHL-matching feel — since this runs inside a GHL iframe, it should look native: their neutral gray palette, compact paddings, familiar table/list styling — so clients never feel they left GHL
Consistency pass — one shared style for all tables, cards, badges, modals, and empty states; same border radii and spacing rhythm everywhere
Feedback everywhere — skeleton loaders on every page (not blank spinners), hover states, colored success/error toasts on every action, confirm dialogs on destructive actions
Board polish — smoother drag ghost, column drop highlights, stage-colored count chips, compact card layout
Mission unchanged and noted again: secure, reliable, production-level — role access is exactly the kind of thing we never compromise on, and Phase 3's whole point is closing those gaps with tests proving it.

Say go and I start Phase 3.

oky start. for storage and other wahtever need ask me i will provide you all keps in env oky . anu question ?
No questions for Phase 3 — it needs zero external services, so no keys required. (First keys I'll need from you come in Phase 4: file-storage + email provider. I'll tell you exactly which env variables to fill when we get there.)

Starting now.

Update Todos

Backend: block team members from creating tickets

Backend: require comment on team-member stage moves

Seed: manually-verified sub-account for testing

Frontend: strict role routes (/admin owner-only, /team/* new)

Frontend: expanded gray sidebar + UI polish

Frontend: mandatory stage-move comment modal + drag loading UI

Frontend: remove New ticket for team members

E2E: full role-matrix verification
Edit c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\backend\src\modules\tickets\tickets.routes.ts
Added 2 lines
Now the mandatory-comment rule for team-member stage moves:

Edit c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\backend\src\modules\tickets\tickets.service.ts
Added 6 lines
Write c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\backend\scripts\add-manual-subaccount.ts
61 lines
/**
 * Adds a manually-verified sub-account (no GHL API involved) so the client
 * flow is fully testable before the real agency-level GHL token arrives.
 * Idempotent — safe to run repeatedly.
 *
 * Portal URL after running:  /portal?location_id=aWST99zZBQl7KUbxQ100
 * (ALPHA PHYSIQUE — the real location we verified against GHL earlier.)
 */
import "dotenv/config";
import { prisma } from "../src/utils/prisma";

const LOCATION_ID = "aWST99zZBQl7KUbxQ100";
const NAME = "ALPHA PHYSIQUE";
const CONTACT = "robert@alphaphysique.com.au";

async function main() {
  const agency = await prisma.agency.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const owner = await prisma.user.findFirstOrThrow({
    where: { agencyId: agency.id, role: "AGENCY_OWNER", isDeleted: false },
  });

  const user = await prisma.user.upsert({
    where: { email_agencyId: { email: CONTACT, agencyId: agency.id } },
    update: {},
    create: {
      name: NAME,
      initials: "AP",
      role: "SUB_ACCOUNT",
      locationId: LOCATION_ID,
      contactEmail: CONTACT,
      email: CONTACT,
      agencyId: agency.id,
    },
  });

  await prisma.subAccount.upsert({
    where: { agencyId_ghlLocationId: { agencyId: agency.id, ghlLocationId: LOCATION_ID } },
    update: { status: "ACTIVE", decidedAt: new Date(), decidedById: owner.id, userId: user.id },
    create: {
      agencyId: agency.id,
      ghlLocationId: LOCATION_ID,
      name: NAME,
      contactEmail: CONTACT,
      status: "ACTIVE",
      decidedAt: new Date(),
      decidedById: owner.id,
      userId: user.id,
    },
  });

  console.log(`Manually-verified sub-account ready: ${NAME}`);
  console.log(`Test URL: http://localhost:3000/portal?location_id=${LOCATION_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
Bash Seed manual sub-account and typecheck backend
IN
cd "c:/Users/success/Desktop/ghl-agency-dashboard-main/ghl-agency-dashboard-main/backend" && node --import=tsx scripts/add-manual-subaccount.ts 2>&1 | tail -2 && npx tsc --noEmit && echo BACKEND_OK

OUT
claude-opus-4-8[1m] is temporarily unavailable, so auto mode cannot determine the safety of Bash right now. Wait briefly and then try this action again. If it keeps failing, continue with other tasks that don't require this action and come back to it later. Note: reading files, searching code, and other read-only operations do not require the classifier and can still be used.
Edit c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\frontend\src\constants\index.ts
Added 2 lines
Edit c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\frontend\src\hooks\auth\useAuth.ts
Added 2 lines
Now the redesigned expanded sidebar with gray GHL-style background:

Write c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\frontend\src\components\layouts\AppShell.tsx
224 lines
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
Now the mandatory stage-move comment modal:

Write c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\frontend\src\components\tickets\StageMoveModal.tsx
138 lines
"use client"

import { ArrowRight, Loader2, Mail, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth/useAuth"
import { useMoveStage } from "@/hooks/query/useTickets"
import { STAGE_MAP } from "@/components/tickets/ticket-bits"
import type { Ticket, TicketStage } from "@/types"

/** Suggested client-facing comment per target stage — editable, never silent. */
function defaultComment(stage: TicketStage, category: string): string {
  const map: Record<TicketStage, string> = {
    NEW: "Returning this ticket to the queue.",
    ACCEPTED: "This has been acknowledged and queued for work.",
    WORKING: `We're actively working on your ${category} issue.`,
    PENDING: "We need a bit more information from you — please reply when you can.",
    REVIEW: "Work is complete and awaiting final sign-off from an admin.",
    RESOLVED: "This issue has been resolved. Thanks for your patience!",
  }
  return map[stage]
}

/**
 * Every stage move goes through this modal — a comment is mandatory for team
 * members (the backend enforces it too) and strongly encouraged for owners.
 */
export function StageMoveModal({
  ticket,
  targetStage,
  onClose,
  onDone,
}: {
  ticket: Ticket
  targetStage: TicketStage
  onClose: () => void
  onDone?: () => void
}) {
  const { isOwner } = useAuth()
  const moveStage = useMoveStage()
  const [comment, setComment] = useState(defaultComment(targetStage, ticket.category))
  const [sendEmail, setSendEmail] = useState(true)

  const from = STAGE_MAP[ticket.stage]
  const to = STAGE_MAP[targetStage]
  const commentMissing = !comment.trim()

  const submit = () => {
    if (commentMissing && !isOwner) {
      toast.error("A comment is required to move the ticket")
      return
    }
    moveStage.mutate(
      { id: ticket.id, data: { stage: targetStage, comment: comment.trim(), sendEmail } },
      {
        onSuccess: () => {
          toast.success(`#${ticket.displayId} moved to ${to.name}`)
          onDone?.()
          onClose()
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not move the ticket"),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900">Move ticket</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-[12px] text-gray-500 mb-2 truncate">
              <span className="font-mono">#{ticket.displayId}</span> · {ticket.subject}
            </p>
            <div className="flex items-center gap-2.5 text-[13px] font-semibold">
              <span className="inline-flex items-center gap-1.5" style={{ color: from.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: from.color }} />
                {from.name}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-300" />
              <span className="inline-flex items-center gap-1.5" style={{ color: to.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: to.color }} />
                {to.name}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
              Comment {isOwner ? <span className="text-gray-400 font-normal">(what's happening with this ticket)</span> : <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full text-[13px] border border-gray-200 rounded-lg p-3 bg-white min-h-[90px] focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Explain this stage change for the record…"
            />
            {commentMissing && !isOwner && (
              <p className="text-[11.5px] text-red-500 mt-1">A comment is required — it becomes the client-facing update.</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-gray-600 cursor-pointer">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded" />
            <Mail className="w-3.5 h-3.5" /> Email this update to the client
          </label>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={moveStage.isPending} className="rounded-lg text-gray-500">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={moveStage.isPending || (commentMissing && !isOwner)}
            className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white"
          >
            {moveStage.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Moving…
              </>
            ) : (
              <>Move to {to.name}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
Write c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\frontend\src\components\board\KanbanBoard.tsx
250 lines
"use client"

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { ChevronDown, Loader2 } from "lucide-react"
import { useState } from "react"
import { STAGES } from "@/constants"
import { cn } from "@/lib/utils"
import type { Ticket, TicketStage, UserRole } from "@/types"
import { Avatar, PriorityBadge } from "@/components/tickets/ticket-bits"

/** Client-side mirror of the backend stage-permission rules (UX only — the API re-checks). */
export function canMoveTo(role: UserRole | undefined, current: TicketStage, target: TicketStage): boolean {
  if (!role || target === current) return false
  if (role === "AGENCY_OWNER") return true
  if (role === "TEAM_MEMBER") return target !== "RESOLVED" && current !== "RESOLVED"
  return false
}

function TicketCard({
  ticket,
  role,
  draggable,
  saving,
  onOpen,
  onMove,
}: {
  ticket: Ticket
  role?: UserRole
  draggable: boolean
  saving: boolean
  onOpen: (t: Ticket) => void
  onMove: (t: Ticket, stage: TicketStage) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    disabled: !draggable || saving,
  })

  const movable = STAGES.filter((s) => canMoveTo(role, ticket.stage, s.key))

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "relative bg-white rounded-xl border border-gray-100 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-200 transition-colors",
        draggable && !saving && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {/* Saving overlay — shown while a move is confirming on the server */}
      {saving && (
        <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Moving…
          </span>
        </div>
      )}

      <button type="button" onClick={() => onOpen(ticket)} className="block w-full text-left">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-mono text-gray-400">#{ticket.displayId}</span>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <p className="text-[13.5px] font-semibold text-gray-900 leading-snug mb-1">{ticket.subject}</p>
        <p className="text-[11.5px] text-gray-500 mb-3">{ticket.subAccount?.name}</p>
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar initials={ticket.assignee?.initials} name={ticket.assignee?.name} muted={!ticket.assignee} />
          <span className="text-[10.5px] bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5 text-gray-500">
            {ticket.category}
          </span>
        </div>
        {movable.length > 0 && (
          <div className="relative">
            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(!menuOpen)
              }}
              className="text-[11px] font-medium text-gray-500 border border-gray-100 rounded-lg px-2 py-1 hover:border-gray-300 flex items-center gap-1 disabled:opacity-50"
            >
              Move <ChevronDown className="w-3 h-3" />
            </button>
            {menuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} aria-label="Close menu" />
                <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden py-1">
                  {movable.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        onMove(ticket, s.key)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 text-left"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StageColumn({
  stage,
  tickets,
  role,
  savingId,
  onOpen,
  onMove,
}: {
  stage: (typeof STAGES)[number]
  tickets: Ticket[]
  role?: UserRole
  savingId: string | null
  onOpen: (t: Ticket) => void
  onMove: (t: Ticket, stage: TicketStage) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })

  return (
    <div className="w-[272px] flex-shrink-0 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-1 pb-3 border-t-[3px] pt-2.5" style={{ borderTopColor: stage.color }}>
        <span className="text-[13px] font-bold text-gray-900">{stage.name}</span>
        <span
          className="text-[11px] font-bold rounded-full px-2 py-0.5"
          style={{ backgroundColor: `${stage.color}1A`, color: stage.color }}
        >
          {tickets.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] rounded-xl flex flex-col gap-2.5 p-1 overflow-y-auto transition-all",
          isOver && "bg-white/80 ring-2 ring-offset-2",
        )}
        style={isOver ? ({ "--tw-ring-color": stage.color } as React.CSSProperties) : undefined}
      >
        {tickets.length === 0 ? (
          <div className={cn("text-center text-[11.5px] py-8 rounded-xl border-2 border-dashed transition-colors", isOver ? "border-gray-300 text-gray-400" : "border-transparent text-gray-300")}>
            {isOver ? "Drop here" : "No tickets"}
          </div>
        ) : (
          tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              role={role}
              draggable={canDragAny(role, t)}
              saving={savingId === t.id}
              onOpen={onOpen}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  )
}

function canDragAny(role: UserRole | undefined, t: Ticket): boolean {
  return STAGES.some((s) => canMoveTo(role, t.stage, s.key))
}

export function KanbanBoard({
  tickets,
  role,
  savingId = null,
  onOpen,
  onMove,
}: {
  tickets: Ticket[]
  role?: UserRole
  /** Ticket id currently confirming a move on the server — shows a card overlay. */
  savingId?: string | null
  onOpen: (t: Ticket) => void
  onMove: (t: Ticket, stage: TicketStage) => void
}) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTicket(tickets.find((t) => t.id === e.active.id) ?? null)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTicket(null)
    const target = e.over?.id as TicketStage | undefined
    const ticket = tickets.find((t) => t.id === e.active.id)
    if (!target || !ticket || !canMoveTo(role, ticket.stage, target)) return
    onMove(ticket, target)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 items-stretch min-h-[60vh]">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            tickets={tickets.filter((t) => t.stage === stage.key)}
            role={role}
            savingId={savingId}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTicket && (
          <div className="bg-white rounded-xl border-2 border-gray-300 p-3.5 shadow-2xl w-[260px] rotate-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-mono text-gray-400">#{activeTicket.displayId}</span>
              <PriorityBadge priority={activeTicket.priority} />
            </div>
            <p className="text-[13.5px] font-semibold text-gray-900">{activeTicket.subject}</p>
            <p className="text-[11.5px] text-gray-500 mt-1">{activeTicket.subAccount?.name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
Write c:\Users\success\Desktop\ghl-agency-dashboard-main\ghl-agency-dashboard-main\frontend\src\components\board\BoardView.tsx
54 lines
"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"