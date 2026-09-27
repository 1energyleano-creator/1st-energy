"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Send, X } from "lucide-react"
import { walletService, type TopUpMessage, type TopUpRequest } from "@/lib/wallet-service"
import { getCurrencySymbolForCountry } from "@/lib/countries"

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  approved: { label: "Approved", color: "#15803D", bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2" },
}

type Props = {
  request: TopUpRequest
  adminId: string
  onClose: () => void
  onReviewed: () => void
}

export function RequestDetail({ request, adminId, onClose, onReviewed }: Props) {
  const [messages, setMessages] = useState<TopUpMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [verifiedAmount, setVerifiedAmount] = useState(
    String(Number.parseFloat(String(request.amount_claimed ?? 0)) || ""),
  )
  const [note, setNote] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [working, setWorking] = useState<null | "approve" | "reject">(null)
  const [error, setError] = useState("")
  const threadRef = useRef<HTMLDivElement>(null)

  const symbol = getCurrencySymbolForCountry(request.country || request.driver?.country)
  const status = STATUS_META[request.status] || STATUS_META.pending
  const isPending = request.status === "pending"

  useEffect(() => {
    let active = true
    setLoading(true)
    walletService.getTopUpMessages(request.id).then(({ data }) => {
      if (!active) return
      setMessages(data)
      setLoading(false)
    })

    const channel = walletService.subscribeToTopUpMessages(request.id, (message) => {
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message],
      )
    })

    return () => {
      active = false
      channel?.unsubscribe?.()
    }
  }, [request.id])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const text = reply.trim()
    if (!text) return
    setSending(true)
    const { data } = await walletService.sendAdminMessage(request.id, adminId, text)
    if (data) {
      setMessages((current) => (current.some((m) => m.id === data.id) ? current : [...current, data]))
      setReply("")
    }
    setSending(false)
  }

  async function handleApprove() {
    const amount = Number.parseFloat(verifiedAmount)
    if (!amount || amount <= 0) {
      setError("Enter a verified amount greater than 0.")
      return
    }
    setError("")
    setWorking("approve")
    const result = await walletService.approveTopUpRequest(request, amount, adminId, note.trim())
    setWorking(null)
    if (result.success) {
      onReviewed()
    } else {
      setError("Could not approve. Please try again.")
    }
  }

  async function handleReject() {
    setError("")
    setWorking("reject")
    const result = await walletService.rejectTopUpRequest(request, rejectReason.trim(), adminId)
    setWorking(null)
    if (result.success) {
      onReviewed()
    } else {
      setError("Could not reject. Please try again.")
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
        <div>
          <p className="text-sm font-bold text-[var(--ink)]">{request.driver?.name || "Driver"}</p>
          <p className="text-xs text-[var(--muted)]">{request.driver?.phone_number || ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </span>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--line)] bg-[#faf9f5] px-5 py-3 text-xs text-[var(--muted)]">
        Claimed amount:{" "}
        <span className="font-bold text-[var(--ink)]">
          {symbol}
          {(Number.parseFloat(String(request.amount_claimed ?? 0)) || 0).toFixed(2)}
        </span>
        {request.amount_verified != null && (
          <>
            {"  ·  Verified: "}
            <span className="font-bold text-[var(--ink)]">
              {symbol}
              {(Number.parseFloat(String(request.amount_verified)) || 0).toFixed(2)}
            </span>
          </>
        )}
      </div>

      <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-center text-xs text-[var(--muted)]">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-[var(--muted)]">No messages in this thread yet.</p>
        ) : (
          messages.map((message) => {
            const fromAdmin = message.sender_role === "admin"
            return (
              <div key={message.id} className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    fromAdmin ? "bg-[var(--dark)] text-white" : "bg-[#f1efe8] text-[var(--ink)]"
                  }`}
                >
                  {message.image_url && (
                    /* Proof-of-payment screenshot the driver uploaded */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.image_url || "/placeholder.svg"}
                      alt="Proof of payment"
                      className="mb-2 max-h-64 w-full rounded-lg object-cover"
                    />
                  )}
                  {message.message && <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>}
                  <p className={`mt-1 text-[10px] ${fromAdmin ? "text-white/60" : "text-[var(--muted)]"}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-[var(--line)] p-3">
        <div className="flex items-center gap-2">
          <input
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder="Message the driver…"
            className="h-11 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
          />
          <button
            onClick={handleSend}
            disabled={sending || !reply.trim()}
            aria-label="Send message"
            className="flex size-11 items-center justify-center rounded-xl bg-[var(--dark)] text-white disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>

        {isPending && (
          <div className="mt-3 space-y-3 rounded-2xl bg-[#faf9f5] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Review request</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">Verified amount</span>
                <input
                  value={verifiedAmount}
                  onChange={(event) => setVerifiedAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">Note (optional)</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. Matches POP"
                  className="h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">Rejection reason (if rejecting)</span>
              <input
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="e.g. POP unreadable, resend a clear photo"
                className="h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
              />
            </label>
            {error && <p className="text-xs font-semibold text-[#b42318]">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={working !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#f0c9c5] bg-white px-4 py-2.5 text-sm font-bold text-[#b91c1c] disabled:opacity-50"
              >
                <X className="size-4" />
                {working === "reject" ? "Rejecting…" : "Reject"}
              </button>
              <button
                onClick={handleApprove}
                disabled={working !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--orange)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <Check className="size-4" />
                {working === "approve" ? "Approving…" : "Approve & credit"}
              </button>
            </div>
          </div>
        )}

        {!isPending && request.admin_note && (
          <p className="mt-3 rounded-xl bg-[#faf9f5] px-4 py-3 text-xs text-[var(--muted)]">
            Admin note: <span className="font-semibold text-[var(--ink)]">{request.admin_note}</span>
          </p>
        )}
      </div>
    </div>
  )
}
