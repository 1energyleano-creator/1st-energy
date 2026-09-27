"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { walletService, type DriverInfo } from "@/lib/wallet-service"
import { getCurrencyForCountry, getCurrencySymbolForCountry } from "@/lib/countries"

type Props = {
  adminId: string
  onClose: () => void
  onAdded: () => void
}

export function ManualTopUpModal({ adminId, onClose, onAdded }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DriverInfo[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<DriverInfo | null>(null)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function runSearch(text: string) {
    setQuery(text)
    setSelected(null)
    if (text.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const { data } = await walletService.searchDrivers(text.trim())
    setResults(data)
    setSearching(false)
  }

  async function submit() {
    if (!selected) {
      setError("Search and select a driver first.")
      return
    }
    const value = Number.parseFloat(amount)
    if (!value || value <= 0) {
      setError("Enter an amount greater than 0.")
      return
    }
    setError("")
    setSubmitting(true)
    const result = await walletService.manualTopUp(selected, value, adminId, note.trim())
    setSubmitting(false)
    if (result.success) {
      onAdded()
    } else {
      setError("Failed to add top-up. Please try again.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--dark)]/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--ink)]">Add wallet top-up</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Driver</label>
        {selected ? (
          <div className="flex items-center gap-3 rounded-xl bg-[#faf9f5] p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[var(--ink)]">{selected.name || "Driver"}</p>
              <p className="truncate text-xs text-[var(--muted)]">{selected.phone_number || ""}</p>
            </div>
            <button onClick={() => setSelected(null)} aria-label="Clear driver" className="text-[var(--muted)] hover:text-[var(--ink)]">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <input
              value={query}
              onChange={(event) => runSearch(event.target.value)}
              placeholder="Search by name or phone"
              autoFocus
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
            />
            {searching && <p className="mt-2 text-xs text-[var(--muted)]">Searching…</p>}
            {results.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--line)]">
                {results.map((driver) => (
                  <li key={driver.id}>
                    <button
                      onClick={() => setSelected(driver)}
                      className="flex w-full flex-col border-b border-[var(--line)] px-3 py-2.5 text-left last:border-0 hover:bg-[#faf9f5]"
                    >
                      <span className="text-sm font-semibold text-[var(--ink)]">{driver.name || "Unnamed driver"}</span>
                      <span className="text-xs text-[var(--muted)]">{driver.phone_number || ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <p className="mt-2 text-center text-xs text-[var(--muted)]">No drivers found.</p>
            )}
          </>
        )}

        <label className="mb-1 mt-4 block text-xs font-semibold text-[var(--muted)]">
          Amount{selected?.country ? ` (${getCurrencyForCountry(selected.country)})` : ""}
        </label>
        <div className="relative">
          {selected?.country && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">
              {getCurrencySymbolForCountry(selected.country)}
            </span>
          )}
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className={`h-11 w-full rounded-xl border border-[var(--line)] bg-white text-sm outline-none focus:border-[var(--orange)] ${
              selected?.country ? "pl-8 pr-3" : "px-3"
            }`}
          />
        </div>

        <label className="mb-1 mt-4 block text-xs font-semibold text-[var(--muted)]">Note (optional)</label>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Cash handed to admin"
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
        />

        {error && <p className="mt-3 text-xs font-semibold text-[#b42318]">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold text-[var(--muted)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-[var(--orange)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add top-up"}
          </button>
        </div>
      </div>
    </div>
  )
}
