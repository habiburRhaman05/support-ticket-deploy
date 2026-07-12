"use client"

import { Copy, Loader2, Trash2, UserPlus, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { Avatar } from "@/components/tickets/ticket-bits"
import { Button } from "@/components/ui/button"
import { useCreateTeamMember, useDeleteTeamMember, useTeamMembers } from "@/hooks/query/useTeamMembers"

function CreateMemberModal({ onClose }: { onClose: () => void }) {
  const createMember = useCreateTeamMember()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [skills, setSkills] = useState("")
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null)

  const inputClass =
    "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"

  const submit = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required")
      return
    }
    createMember.mutate(
      { name: name.trim(), email: email.trim(), skills: skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) },
      {
        onSuccess: (m: any) => {
          setCreated({ email: m.email, tempPassword: m.tempPassword })
          toast.success(`${m.name} created`)
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not create the team member"),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={created ? undefined : onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{created ? "Credentials — shown once" : "New team member"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {created ? (
          <div className="px-6 py-5">
            <p className="text-[13px] text-gray-600 leading-relaxed mb-4">
              Share these with the new member — the temporary password is <strong>not stored in plain text and cannot be shown again</strong>. They'll be asked to change it after first login.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 font-mono text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{created.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500">Password</span>
                <span className="text-gray-900">{created.tempPassword}</span>
              </div>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`Login: ${created.email}\nTemporary password: ${created.tempPassword}`)
                toast.success("Copied to clipboard")
              }}
              variant="outline"
              className="w-full mt-4 rounded-xl border-gray-200"
            >
              <Copy className="w-4 h-4 mr-2" /> Copy credentials
            </Button>
            <Button onClick={onClose} className="w-full mt-2 rounded-xl bg-black hover:bg-gray-800 text-white">
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="jane@agency.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Skills (comma-separated)</label>
                <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="technical, billing, api" className={inputClass} />
                <p className="text-[11px] text-gray-400 mt-1.5">Used by auto-assignment to match tickets by category.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} className="rounded-lg text-gray-500">Cancel</Button>
              <Button disabled={createMember.isPending} onClick={submit} className="rounded-lg bg-black hover:bg-gray-800 text-white">
                {createMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create member
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TeamPage() {
  const { data: team, isLoading } = useTeamMembers()
  const deleteMember = useDeleteTeamMember()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <AppShell
      title="Team roster"
      subtitle="Availability, skills, and live workload."
      actions={
        <Button onClick={() => setModalOpen(true)} className="rounded-xl bg-black hover:bg-gray-800 text-white h-10">
          <UserPlus className="w-4 h-4 mr-1.5" /> Add member
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Member</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Skills</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Open</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">In review</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(team as any[])?.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={m.initials} name={m.name} />
                      <div>
                        <p className="font-medium text-gray-900">{m.name}</p>
                        <p className="text-[11px] text-gray-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${m.isAvailable ? "text-green-700" : "text-gray-400"}`}>
                      <span className={`w-2 h-2 rounded-full ${m.isAvailable ? "bg-green-500" : "bg-gray-300"}`} />
                      {m.isAvailable ? "Available" : "Away"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {(Array.isArray(m.skills) ? m.skills : []).map((s: string) => (
                        <span key={s} className="text-[10.5px] bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5 text-gray-500">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 font-medium">{m.openTickets}</td>
                  <td className="px-5 py-3.5 text-gray-700 font-medium">{m.reviewTickets}</td>
                  <td className="px-5 py-3.5 text-right">
                    {confirmDelete === m.id ? (
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            deleteMember.mutate(m.id, {
                              onSuccess: () => { toast.success(`${m.name} removed — open tickets returned to the queue`); setConfirmDelete(null) },
                              onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Removal failed"),
                            })
                          }
                          className="text-[12px] font-semibold text-red-600 hover:text-red-700"
                        >
                          Confirm
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className="text-[12px] text-gray-400">Cancel</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(m.id)} className="text-gray-300 hover:text-red-500 p-1" title="Remove member">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modalOpen && <CreateMemberModal onClose={() => setModalOpen(false)} />}
    </AppShell>
  )
}

export default function AdminTeamPage() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <TeamPage />
    </AuthGuard>
  )
}
