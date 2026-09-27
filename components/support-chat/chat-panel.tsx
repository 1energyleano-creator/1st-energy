"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Send, User } from "lucide-react"
import { getCountry } from "@/lib/countries"
import type { ChatThreadSummary } from "./thread-list"

// Unified message shape both pages map their service's message type into.
export type ChatMessageItem = {
  id: string
  message: string
  fromOther: boolean
  created_at: string
}

type Props = {
  thread: ChatThreadSummary
  messages: ChatMessageItem[]
  loading: boolean
  otherRoleLabel: string
  onSend: (text: string) => Promise<void>
}

export function ChatPanel({ thread, messages, loading, otherRoleLabel, onSend }: Props) {
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" })
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function handleSend() {
    const text = newMessage.trim()
    if (!text || sending) return
    setNewMessage("")
    setSending(true)
    await onSend(text)
    setSending(false)
  }

  const country = getCountry(thread.country)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        {thread.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thread.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fff0e6] text-[var(--orange)]">
            <User className="size-4" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--ink)]">{thread.name}</p>
          <p className="truncate text-xs text-[var(--muted)]">
            {thread.phone || "No phone on file"}
            {thread.country ? ` · ${country.flag} ${thread.city || country.name}` : ""}
          </p>
        </div>
      </div>

      <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-6">
        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="my-auto text-center text-xs text-[var(--muted)]">Loading conversation…</p>
          ) : messages.length === 0 ? (
            <p className="my-auto text-center text-xs text-[var(--muted)]">No messages in this thread yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.fromOther ? "items-start" : "items-end"}`}>
                {m.fromOther && <span className="mb-1 text-[11px] font-semibold text-[var(--orange)]">{otherRoleLabel}</span>}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.fromOther
                      ? "rounded-bl-sm border border-[var(--line)] bg-white text-[var(--ink)]"
                      : "rounded-br-sm bg-[#2196F3] text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                </div>
                <span className="mt-1 text-[10px] text-[#a7a293]">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-[var(--line)] px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder={`Message ${thread.name}…`}
            maxLength={500}
            className="h-11 flex-1 rounded-full border border-[var(--line)] bg-[#faf9f5] px-4 text-sm outline-none focus:border-[var(--orange)]"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-white disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
