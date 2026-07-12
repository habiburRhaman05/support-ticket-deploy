"use client"

import { formatDistanceToNow } from "date-fns"
import { Inbox, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal"
import { PriorityBadge } from "@/components/tickets/ticket-bits"
import { useTeamMembers } from "@/hooks/query/useTeamMembers"
import { useAssignTicket, useUnassignedTickets } from "@/hooks/query/useTickets"

function UnassignedPage() {
  const { data: tickets, isLoading } = useUnassignedTickets()
  const { data: team } = useTeamMembers()
  const assign = useAssignTicket()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <AppShell title="Unassigned queue" subtitle="No one was available when these arrived — assign them by hand.">
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : !tickets?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nothing waiting — everything got assigned automatically.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Ticket</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Client</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Priority</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Waiting</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Assign to</th>
              </tr>
            </thead>
            <tbody>
              {(tickets as any[]).map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                  <td className="px-5 py-3.5">
                    <button type="button" onClick={() => setOpenId(t.id)} className="text-left">
                      <span className="text-[10.5px] font-mono text-gray-400 block">#{t.displayId}</span>
                      <span className="font-medium text-gray-900">{t.subject}</span>
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{t.subAccount?.name}</td>
                  <td className="px-5 py-3.5"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-5 py-3.5 text-[12px] text-gray-400">
                    {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (!e.target.value) return
                        assign.mutate(
                          { id: t.id, assigneeId: e.target.value },
                          {
                            onSuccess: () => toast.success(`#${t.displayId} assigned`),
                            onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Assignment failed"),
                          },
                        )
                      }}
                      className="text-[12.5px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none"
                    >
                      <option value="">Choose a member…</option>
                      {team?.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name}{m.isAvailable ? "" : " (away)"}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openId && <TicketDetailModal ticketId={openId} onClose={() => setOpenId(null)} />}
    </AppShell>
  )
}

export default function AdminUnassignedPage() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <UnassignedPage />
    </AuthGuard>
  )
}
