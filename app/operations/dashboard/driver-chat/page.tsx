"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { driverChatService, type DriverChatThread, type DriverChatMessage } from "@/lib/driver-chat-service"
import { ThreadList, type ChatThreadSummary } from "@/components/support-chat/thread-list"
import { ChatPanel, type ChatMessageItem } from "@/components/support-chat/chat-panel"

function toSummary(t: DriverChatThread): ChatThreadSummary {
  return {
    id: t.driverId,
    name: t.driverName,
    phone: t.driverPhone,
    avatarUrl: t.avatarUrl,
    country: t.country,
    city: t.city,
    lastMessage: t.lastMessage,
    lastFromOther: t.lastSenderRole === "driver",
    lastMessageAt: t.lastMessageAt,
    unreadCount: t.unreadCount,
  }
}

function toMessageItem(m: DriverChatMessage): ChatMessageItem {
  return { id: m.id, message: m.message, fromOther: m.sender_role === "driver", created_at: m.created_at }
}

export default function DriverChatPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [threads, setThreads] = useState<DriverChatThread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DriverChatMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const loadThreads = useCallback(async () => {
    setLoading(true)
    const { data } = await driverChatService.getAllThreads()
    setThreads(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!admin) return
    loadThreads()
    const channel = driverChatService.subscribeToAllThreads(() => loadThreads())
    return () => {
      channel?.unsubscribe?.()
    }
  }, [admin, loadThreads])

  const selected = threads.find((t) => t.driverId === selectedId) || null

  useEffect(() => {
    if (!selectedId) return
    let active = true
    setLoadingThread(true)
    driverChatService.getMessages(selectedId).then(({ data }) => {
      if (!active) return
      setMessages(data)
      setLoadingThread(false)
    })
    driverChatService.markReadByAdmin(selectedId).then(() => {
      setThreads((prev) => prev.map((t) => (t.driverId === selectedId ? { ...t, unreadCount: 0 } : t)))
    })

    const channel = driverChatService.subscribeToMessages(selectedId, (message) => {
      setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]))
    })
    return () => {
      active = false
      channel?.unsubscribe?.()
    }
  }, [selectedId])

  async function handleSend(text: string) {
    if (!selectedId) return
    const { data } = await driverChatService.sendMessage(selectedId, text)
    if (data) {
      setMessages((current) => (current.some((m) => m.id === data.id) ? current : [...current, data]))
      setThreads((prev) =>
        prev.map((t) => (t.driverId === selectedId ? { ...t, lastMessage: data.message, lastSenderRole: "admin", lastMessageAt: data.created_at } : t)),
      )
    }
  }

  if (authLoading || !admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--cream)] text-[var(--muted)]">
        <p className="text-sm">Checking your access…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <header className="flex h-20 items-center justify-between border-b border-[var(--line)] px-5 sm:px-8">
        <Link href="/operations/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Messaging</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Driver Chat</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Direct messages with drivers — separate from Wallet Top-Up conversations, which live under Wallet Top-Ups.
            </p>
          </div>
          <button
            onClick={loadThreads}
            className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            {loading ? (
              <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
                Loading threads…
              </p>
            ) : (
              <ThreadList
                threads={threads.map(toSummary)}
                selectedId={selectedId}
                onSelect={(t) => setSelectedId(t.id)}
                emptyLabel="No driver conversations yet."
              />
            )}
          </div>

          <div className="lg:h-[calc(100vh-15rem)] lg:sticky lg:top-6">
            {selected ? (
              <ChatPanel
                key={selected.driverId}
                thread={toSummary(selected)}
                messages={messages.map(toMessageItem)}
                loading={loadingThread}
                otherRoleLabel="Driver"
                onSend={handleSend}
              />
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white text-center">
                <p className="max-w-xs px-6 text-sm text-[var(--muted)]">Select a driver to view and reply to their messages.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
