"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { BoardView } from "@/components/board/BoardView"
import { AppShell } from "@/components/layouts/AppShell"
import { NewTicketModal } from "@/components/tickets/NewTicketModal"
import { CATEGORIES } from "@/components/tickets/ticket-bits"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth/useAuth"
import { useSubAccounts, useTeamMembers } from "@/hooks/query/useTeamMembers"
import { useMyTickets, useTickets } from "@/hooks/query/useTickets"

function OwnerBoard() {
  const [filters, setFilters] = useState({ subAccountId: "", assigneeId: "", priority: "", category: "" })
  const { data, isLoading } = useTickets({
    limit: 100,
    ...(filters.subAccountId && { subAccountId: filters.subAccountId }),
    ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.category && { category: filters.category }),
  })
  const { data: team } = useTeamMembers()
  const { data: subAccounts } = useSubAccounts()

  const selectClass =
    "text-[12.5px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-black/10"

  return (
    <>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <select value={filters.subAccountId} onChange={(e) => setFilters({ ...filters, subAccountId: e.target.value })} className={selectClass}>
          <option value="">All clients</option>
          {subAccounts?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.assigneeId} onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })} className={selectClass}>
          <option value="">All assignees</option>
          {team?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className={selectClass}>
          <option value="">All priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className={selectClass}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <BoardView tickets={data?.tickets ?? []} isLoading={isLoading} />
    </>
  )
}

function TeamBoard() {
  const { data: tickets, isLoading } = useMyTickets()
  return <BoardView tickets={tickets ?? []} isLoading={isLoading} />
}

function BoardPage() {
  const { isOwner } = useAuth()
  const [newTicketOpen, setNewTicketOpen] = useState(false)

  return (
    <AppShell
      fullWidth
      title={isOwner ? "Support board" : "My tickets"}
      subtitle={
        isOwner
          ? "Every ticket across the agency, in one pipeline."
          : "Tickets assigned to you — move them through the pipeline up to Review."
      }
      actions={
        // Team members work tickets, they don't create them — the New ticket
        // action is owner-only (the backend blocks it for team members too).
        isOwner ? (
          <Button onClick={() => setNewTicketOpen(true)} className="rounded-xl bg-black hover:bg-gray-800 text-white h-10">
            <Plus className="w-4 h-4 mr-1.5" /> New ticket
          </Button>
        ) : undefined
      }
    >
      {isOwner ? <OwnerBoard /> : <TeamBoard />}
      {newTicketOpen && <NewTicketModal onClose={() => setNewTicketOpen(false)} />}
    </AppShell>
  )
}

export default function AdminBoardPage() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER", "TEAM_MEMBER"]}>
      <BoardPage />
    </AuthGuard>
  )
}
