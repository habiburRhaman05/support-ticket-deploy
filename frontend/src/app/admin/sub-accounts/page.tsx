"use client"

import { Loader2, Store } from "lucide-react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { Avatar } from "@/components/tickets/ticket-bits"
import { useSubAccounts } from "@/hooks/query/useTeamMembers"

function SubAccountsPage() {
  const { data: accounts, isLoading } = useSubAccounts()

  return (
    <AppShell title="Sub-accounts" subtitle="Every client with portal access and their open workload.">
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : !accounts?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Store className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            No sub-accounts yet — they appear here once approved via the access requests queue.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Client</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Contact</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Location ID</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Open tickets</th>
              </tr>
            </thead>
            <tbody>
              {(accounts as any[]).map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={s.initials} name={s.name} />
                      <span className="font-medium text-gray-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{s.contactEmail || "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-[11.5px] text-gray-400">{s.locationId}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-semibold ${s.openTickets > 0 ? "text-gray-900" : "text-gray-300"}`}>{s.openTickets}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}

export default function AdminSubAccountsPage() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <SubAccountsPage />
    </AuthGuard>
  )
}
