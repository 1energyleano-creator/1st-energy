"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Send, X } from "lucide-react"
import { walletService, type TopUpMessage, type TopUpRequest } from "@/lib/wallet-service"
import { getCurrencySymbolForCountry } from "@/lib/countries"
import { useAdminSession } from "@/lib/use-admin-session"

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending Review", color: "#B45309", bg: "#FEF3C7" },
  approved: { label: "Approved", color: "#15803D", bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2" },
}

export function WalletTopUpChat({ requestId }: { requestId: string }) {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [request, setRequest] = useState<TopUpRequest | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [messages, setMessages] = useState<TopUpMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)

  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifiedAmount, setVerifiedAmount] = useState("")
  const [note, setNote] = useState("")
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [working, setWorking] = useState<null | "approve" | "reject">(null)
  const [modalError, setModalError] = useState("")
  const [creditedAmount, setCreditedAmount] = useState<number | null>(null)

  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" })
    })
  }, [])

  useEffect(() => {
    if (!admin) return
    let active = true

    walletService.getTopUpRequestById(requestId).then(({ data }) => {
      if (!active) return
      if (!data) {
        setNotFound(true)
        return
      }
      setRequest(data)
      setVerifiedAmount(String(Number.parseFloat(String(data.amount_claimed ?? 0)) || ""))
    })

    setLoadingThread(true)
    walletService.getTopUpMessages(requestId).then(({ data }) => {
      if (!active) return
      setMessages(data)
      setLoadingThread(false)
      scrollToBottom()
    })

    const messageChannel = walletService.subscribeToTopUpMessages(requestId, (message) => {
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message],
      )
      scrollToBottom()
    })

    const requestChannel = walletService.subscribeToTopUpRequest(requestId, (updated) => {
      setRequest((current) => (current ? { ...current, ...updated } : current))
    })

    return () => {
      active = false
      messageChannel?.unsubscribe?.()
      requestChannel?.unsubscribe?.()
    }
  }, [admin, requestId, scrollToBottom])

  async function handleSend() {
    const text = newMessage.trim()
    if (!text || !admin) return
    setNewMessage("")
    setSending(true)
    const { data } = await walletService.sendAdminMessage(requestId, admin.id, text)
    if (data) {
      setMessages((current) => (current.some((m) => m.id === data.id) ? current : [...current, data]))
      scrollToBottom()
    }
    setSending(false)
  }

  async function confirmApprove() {
    if (!request || !admin) return
    const amount = Number.parseFloat(verifiedAmount)
    if (!amount || amount <= 0) {
      setModalError("Enter the verified amount to credit.")
      return
    }
    setModalError("")
    setWorking("approve")
    const result = await walletService.approveTopUpRequest(request, amount, admin.id, note.trim())
    setWorking(null)
    if (result.success) {
      setRequest((current) => (current ? { ...current, status: "approved", amount_verified: amount } : current))
      setVerifyOpen(false)
      setCreditedAmount(amount)
    } else {
      setModalError("Failed to approve this request. Please try again.")
    }
  }

  async function confirmReject() {
    if (!request || !admin) return
    setModalError("")
    setWorking("reject")
    const result = await walletService.rejectTopUpRequest(request, rejectReason.trim(), admin.id)
    setWorking(null)
    if (result.success) {
      setRequest((current) => (current ? { ...current, status: "rejected" } : current))
      setRejectOpen(false)
      setRejectReason("")
    } else {
      setModalError("Failed to reject this request. Please try again.")
    }
  }

  if (authLoading || !admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--cream)] text-[var(--muted)]">
        <p className="text-sm">Checking your access…</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--cream)] text-[var(--muted)]">
        <p className="text-sm">This top-up request could not be found.</p>
        <button
          onClick={() => router.push("/operations/dashboard/wallet")}
          className="rounded-xl bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white"
        >
          Back to Wallet Top-Ups
        </button>
      </main>
    )
  }

  const symbol = getCurrencySymbolForCountry(request?.country || request?.driver?.country)
  const status = STATUS_META[request?.status || "pending"] || STATUS_META.pending
  const canReview = request?.status === "pending"
  const claimed = Number.parseFloat(String(request?.amount_claimed ?? 0)) || 0

  return (
    <main className="flex min-h-screen flex-col bg-[var(--cream)] text-[var(--ink)]">
      <header className="flex items-center gap-4 border-b border-[var(--line)] bg-white px-5 py-4 sm:px-8">
        <button
          onClick={() => router.push("/operations/dashboard/wallet")}
          aria-label="Back to Wallet Top-Ups"
          className="flex size-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[#f1efe8] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--ink)]">{request?.driver?.name || "Driver"}</p>
          <p className="truncate text-xs font-semibold" style={{ color: status.color }}>
            {status.label} · Claimed {symbol}
            {claimed.toFixed(2)}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </header>

      <div
        ref={threadRef}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-5 py-6 sm:px-8"
      >
        {loadingThread ? (
          <p className="my-auto text-center text-xs text-[var(--muted)]">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="my-auto text-center text-xs text-[var(--muted)]">No messages in this thread yet.</p>
        ) : (
          messages.map((message) => {
            const fromAdmin = message.sender_role === "admin"
            return (
              <div key={message.id} className={`flex flex-col ${fromAdmin ? "items-end" : "items-start"}`}>
                {!fromAdmin && <span className="mb-1 text-[11px] font-semibold text-[var(--orange)]">Driver</span>}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    fromAdmin
                      ? "rounded-br-sm bg-[#2196F3] text-white"
                      : "rounded-bl-sm border border-[var(--line)] bg-white text-[var(--ink)]"
                  }`}
                >
                  {message.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.image_url || "/placeholder.svg"}
                      alt="Proof of payment"
                      className="mb-2 max-h-72 w-full rounded-lg object-cover"
                    />
                  )}
                  {message.message && <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>}
                </div>
                <span className="mt-1 text-[10px] text-[#a7a293]">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          {canReview && (
            <div className="flex gap-3 py-3">
              <button
                onClick={() => {
                  setModalError("")
                  setRejectOpen(true)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FEE2E2] px-4 py-3 text-sm font-bold text-[#DC2626]"
              >
                <X className="size-4" />
                Reject
              </button>
              <button
                onClick={() => {
                  setModalError("")
                  setVerifyOpen(true)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-bold text-white"
              >
                <Check className="size-4" />
                Approve &amp; Credit
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 py-3">
            <input
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                  event.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask the driver a question…"
              maxLength={300}
              className="h-11 flex-1 rounded-full border border-[var(--line)] bg-[#faf9f5] px-4 text-sm outline-none focus:border-[var(--orange)]"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              aria-label="Send message"
              className="flex size-11 items-center justify-center rounded-full bg-[var(--orange)] text-white disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {verifyOpen && (
        <Modal onClose={() => setVerifyOpen(false)}>
          <h2 className="text-lg font-bold text-[var(--ink)]">Confirm Amount to Credit</h2>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Verify this matches the driver&apos;s Proof of Payment before confirming.
          </p>
          <label className="mt-4 block">
            <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">Verified amount ({symbol})</span>
            <input
              value={verifiedAmount}
              onChange={(event) => setVerifiedAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">Note (optional)</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Matches POP"
              className="h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
            />
          </label>
          {modalError && <p className="mt-3 text-xs font-semibold text-[#b42318]">{modalError}</p>}
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setVerifyOpen(false)}
              className="flex-1 rounded-xl bg-[#f0f0f0] py-3 text-sm font-semibold text-[#555]"
            >
              Cancel
            </button>
            <button
              onClick={confirmApprove}
              disabled={working !== null}
              className="flex-1 rounded-xl bg-[#16A34A] py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {working === "approve" ? "Crediting…" : "Credit Wallet"}
            </button>
          </div>
        </Modal>
      )}

      {rejectOpen && (
        <Modal onClose={() => setRejectOpen(false)}>
          <h2 className="text-lg font-bold text-[var(--ink)]">Reject Top-Up Request</h2>
          <p className="mt-1.5 text-xs text-[var(--muted)]">Let the driver know why (optional).</p>
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="e.g. Proof of Payment is unclear, please resend."
            rows={3}
            className="mt-4 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--orange)]"
          />
          {modalError && <p className="mt-3 text-xs font-semibold text-[#b42318]">{modalError}</p>}
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setRejectOpen(false)}
              className="flex-1 rounded-xl bg-[#f0f0f0] py-3 text-sm font-semibold text-[#555]"
            >
              Cancel
            </button>
            <button
              onClick={confirmReject}
              disabled={working !== null}
              className="flex-1 rounded-xl bg-[#DC2626] py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {working === "reject" ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </Modal>
      )}

      {creditedAmount != null && (
        <Modal onClose={() => setCreditedAmount(null)}>
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
              <Check className="size-7" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-[var(--ink)]">Wallet Credited</h2>
            <p className="mt-1.5 text-xs text-[var(--muted)]">The driver&apos;s wallet has been topped up.</p>
            <div className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#faf9f5] px-4 py-3 text-sm">
              <span className="text-[var(--muted)]">Amount</span>
              <span className="font-bold text-[var(--ink)]">
                {symbol}
                {creditedAmount.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => setCreditedAmount(null)}
              className="mt-5 w-full rounded-xl bg-[var(--dark)] py-3 text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
