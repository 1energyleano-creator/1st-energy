"use client"

import { User, Wallet } from "lucide-react"
import type { TopUpRequest } from "@/lib/wallet-service"
import { getCountry, getCurrencySymbolForCountry } from "@/lib/countries"

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  approved: { label: "Approved", color: "#15803D", bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2" },
}

type Props = {
  requests: TopUpRequest[]
  selectedId: string | null
  onSelect: (request: TopUpRequest) => void
}

export function RequestList({ requests, selectedId, onSelect }: Props) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
        <Wallet className="size-12 text-[#d8d2c4]" aria-hidden="true" />
        <p className="mt-3 text-sm text-[var(--muted)]">No top-up requests here.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => {
        const status = STATUS_META[request.status] || STATUS_META.pending
        const country = getCountry(request.country || request.driver?.country)
        const symbol = getCurrencySymbolForCountry(request.country || request.driver?.country)
        const amount = Number.parseFloat(String(request.amount_claimed ?? 0)) || 0
        const active = request.id === selectedId

        return (
          <li key={request.id}>
            <button
              type="button"
              onClick={() => onSelect(request)}
              className={`flex w-full items-center justify-between gap-4 rounded-2xl border bg-white p-4 text-left transition hover:border-[var(--orange)] ${
                active ? "border-[var(--orange)] ring-2 ring-[var(--orange)]/20" : "border-[var(--line)]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fff0e6] text-[var(--orange)]">
                  <User className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-[var(--ink)]">{request.driver?.name || "Driver"}</p>
                    <span className="shrink-0 rounded-md bg-[#f1efe8] px-1.5 py-0.5 text-[10px] font-semibold text-[#5a5648]">
                      {country.flag} {country.name}
                    </span>
                  </div>
                  <p className="truncate text-xs text-[var(--muted)]">{request.driver?.phone_number || "No phone on file"}</p>
                  <p className="mt-0.5 text-[11px] text-[#a7a293]">
                    {new Date(request.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-sm font-bold text-[var(--ink)]">
                  {symbol}
                  {amount.toFixed(2)}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
