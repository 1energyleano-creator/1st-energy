"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, RefreshCw } from "lucide-react"
import { walletService, type TopUpRequest, type TopUpStatus } from "@/lib/wallet-service"
import { useAdminSession } from "@/lib/use-admin-session"
import { RequestList } from "@/components/wallet/request-list"
import { RequestDetail } from "@/components/wallet/request-detail"
import { ManualTopUpModal } from "@/components/wallet/manual-topup-modal"

const FILTERS: { key: TopUpStatus | null; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: null, label: "All" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

export default function WalletTopUpsPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [filter, setFilter] = useState<TopUpStatus | null>("pending")
  const [requests, setRequests] = useState<TopUpRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TopUpRequest | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) {
      router.replace("/operations")
    }
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await walletService.getAllTopUpRequests(filter)
    setRequests(data)
    setLoading(false)
    setSelected((current) => (current ? data.find((r) => r.id === current.id) || null : null))
  }, [filter])

  useEffect(() => {
    if (!admin) return
    load()
    const channel = walletService.subscribeToNewTopUpRequests(() => load())
    return () => {
      channel?.unsubscribe?.()
    }
  }, [admin, load])

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
        <Link
          href="/operations/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
            {(admin.name || "AD").slice(0, 2).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Wallet</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Wallet Top-Ups</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Review Mobile Money top-up requests from drivers, then approve to credit their wallet or reject with a reason.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <RefreshCw className="size-4" />
              Refresh
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3 text-xs font-bold text-white"
            >
              <Plus className="size-4" />
              Add top-up
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.label}
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                filter === item.key ? "bg-[var(--orange)] text-white" : "bg-white text-[var(--muted)] border border-[var(--line)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            {loading ? (
              <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
                Loading requests…
              </p>
            ) : (
              <RequestList requests={requests} selectedId={selected?.id ?? null} onSelect={setSelected} />
            )}
          </div>

          <div className="lg:h-[calc(100vh-15rem)] lg:sticky lg:top-6">
            {selected ? (
              <RequestDetail
                key={selected.id}
                request={selected}
                adminId={admin.id}
                onClose={() => setSelected(null)}
                onReviewed={() => {
                  load()
                }}
              />
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white text-center">
                <p className="max-w-xs px-6 text-sm text-[var(--muted)]">
                  Select a request to view the conversation, proof of payment, and approve or reject it.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {addOpen && (
        <ManualTopUpModal
          adminId={admin.id}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false)
            load()
          }}
        />
      )}
    </main>
  )
}
