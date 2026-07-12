"use client"

import { Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth/useAuth"
import { useCreateTicket, useUploadAttachments } from "@/hooks/query/useTickets"
import { useSubAccounts } from "@/hooks/query/useTeamMembers"
import { AttachmentPicker } from "./attachments"
import { CATEGORIES } from "./ticket-bits"

export function NewTicketModal({ onClose }: { onClose: () => void }) {
  const { isSubAccount } = useAuth()
  // Owner-only endpoint — a client submitting a ticket must not call it.
  const { data: subAccounts } = useSubAccounts({ enabled: !isSubAccount })
  const createTicket = useCreateTicket()
  const uploadAttachments = useUploadAttachments()

  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("technical")
  const [priority, setPriority] = useState("MEDIUM")
  const [subAccountId, setSubAccountId] = useState("")
  const [files, setFiles] = useState<File[]>([])

  const busy = createTicket.isPending || uploadAttachments.isPending

  const submit = () => {
    if (!subject.trim()) {
      toast.error("Give the ticket a subject")
      return
    }
    if (!isSubAccount && !subAccountId) {
      toast.error("Choose which client this ticket is for")
      return
    }
    createTicket.mutate(
      {
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        ...(isSubAccount ? {} : { subAccountId }),
      },
      {
        onSuccess: async (t) => {
          // Ticket exists now — upload any chosen files against it. A failed
          // upload doesn't undo the ticket; we just warn.
          if (files.length) {
            try {
              await uploadAttachments.mutateAsync({ id: t.id, files })
            } catch {
              toast.error("Ticket created, but some files failed to upload")
            }
          }
          toast.success(
            t.assignee
              ? `Ticket #${t.displayId} created and assigned to ${t.assignee.name}`
              : `Ticket #${t.displayId} created — waiting in the unassigned queue`,
          )
          onClose()
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not create the ticket"),
      },
    )
  }

  const inputClass =
    "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{isSubAccount ? "Submit a ticket" : "New ticket"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!isSubAccount && (
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Client</label>
              <select value={subAccountId} onChange={(e) => setSubAccountId(e.target.value)} className={inputClass}>
                <option value="">Choose a sub-account…</option>
                {subAccounts?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary of the issue" className={inputClass} />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's going on?"
              className={`${inputClass} min-h-[90px]`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Attachments</label>
            <AttachmentPicker files={files} onChange={setFiles} disabled={busy} label="Add screenshots or files" />
          </div>

          <p className="text-[11.5px] text-gray-400 leading-relaxed">
            {isSubAccount
              ? "We'll route this to the right person automatically."
              : "Routed by skill match → least-busy available member, or into the unassigned queue if nobody's available."}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-lg text-gray-500">
            Cancel
          </Button>
          <Button disabled={busy} onClick={submit} className="rounded-lg bg-black hover:bg-gray-800 text-white">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create ticket
          </Button>
        </div>
      </div>
    </div>
  )
}
