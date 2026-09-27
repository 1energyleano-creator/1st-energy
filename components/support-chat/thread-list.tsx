"use client"

import { MessageCircle, User } from "lucide-react"
import { getCountry } from "@/lib/countries"

// Unified shape both the driver-chat and customer-chat pages map their
// service's thread type into, so this list (and chat-panel.tsx) only need
// to be written once.
export type ChatThreadSummary = {
  id: string
  name: string
  phone: string
  avatarUrl: string | null
  country: string | null
  city: string | null
  lastMessage: string
  lastFromOther: boolean
  lastMessageAt: string
  unreadCount: number
}

type Props = {
  threads: ChatThreadSummary[]
  selectedId: string | null
  onSelect: (thread: ChatThreadSummary) => void
  emptyLabel: string
}

export function ThreadList({ threads, selectedId, onSelect, emptyLabel }: Props) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
        <MessageCircle className="size-12 text-[#d8d2c4]" aria-hidden="true" />
        <p className="mt-3 text-sm text-[var(--muted)]">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {threads.map((thread) => {
        const country = getCountry(thread.country)
        const active = thread.id === selectedId

        return (
          <li key={thread.id}>
            <button
              type="button"
              onClick={() => onSelect(thread)}
              className={`flex w-full items-center justify-between gap-4 rounded-2xl border bg-white p-4 text-left transition hover:border-[var(--orange)] ${
                active ? "border-[var(--orange)] ring-2 ring-[var(--orange)]/20" : "border-[var(--line)]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                {thread.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thread.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fff0e6] text-[var(--orange)]">
                    <User className="size-5" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-[var(--ink)]">{thread.name}</p>
                    {thread.country && (
                      <span className="shrink-0 rounded-md bg-[#f1efe8] px-1.5 py-0.5 text-[10px] font-semibold text-[#5a5648]">
                        {country.flag} {thread.city || country.name}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {thread.lastFromOther ? "" : "You: "}
                    {thread.lastMessage}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#a7a293]">
                    {new Date(thread.lastMessageAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
              {thread.unreadCount > 0 && (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-[11px] font-bold text-white">
                  {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
