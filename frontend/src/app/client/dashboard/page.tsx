"use client"

import { formatDistanceToNow } from "date-fns"
import { Loader2, Plus, TicketCheck } from "lucide-react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { NewTicketModal } from "@/components/tickets/NewTicketModal"
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal"
import { PriorityBadge, StageBadge } from "@/components/tickets/ticket-bits"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants"
import { useMySubmittedTickets } from "@/hooks/query/useTickets"

function ClientDashboard() {
  const { data: tickets, isLoading } = useMySubmittedTickets()
  const [openId, setOpenId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  return (
    <AppShell
      title="My tickets"
      subtitle="Track every ticket you've submitted and its current stage."
      actions={
        <Button onClick={() => setNewOpen(true)} className="rounded-xl bg-black hover:bg-gray-800 text-white h-10">
          <Plus className="w-4 h-4 mr-1.5" /> Submit a ticket
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : !tickets?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <TicketCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No tickets yet</p>
          <p className="text-gray-400 text-[12.5px] mt-1">Submit your first ticket and we'll route it to the right person.</p>
          <Button onClick={() => setNewOpen(true)} className="mt-5 rounded-xl bg-black hover:bg-gray-800 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Submit a ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenId(t.id)}
              className="w-full text-left bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] font-mono text-gray-400">#{t.displayId}</span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <p className="text-[14px] font-semibold text-gray-900">{t.subject}</p>
                  <p className="text-[11.5px] text-gray-400 mt-1">
                    Updated {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                    {t.stage === "PENDING" && <span className="text-purple-600 font-medium"> · the team asked for information — tap to reply</span>}
                  </p>
                </div>
                <StageBadge stage={t.stage} />
              </div>
            </button>
          ))}
        </div>
      )}
      {openId && <TicketDetailModal ticketId={openId} onClose={() => setOpenId(null)} />}
      {newOpen && <NewTicketModal onClose={() => setNewOpen(false)} />}
    </AppShell>
  )
}

export default function ClientDashboardPage() {
  return (
    <AuthGuard allowedRoles={["SUB_ACCOUNT"]} redirectTo={ROUTES.PORTAL}>
      <ClientDashboard />
    </AuthGuard>
  )
}
