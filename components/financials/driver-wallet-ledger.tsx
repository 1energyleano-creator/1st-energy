"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, RefreshCw, TruckIcon, WalletCards } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import { driverFinancialsService, type WalletLedgerEntry } from "@/lib/driver-financials-service"

function money(n: number, symbol = "") {
  return `${symbol}${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export function DriverWalletLedger({ driverId }: { driverId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: authLoading, admin } = useAdminSession()

  const driverName = searchParams.get("name") || "Driver"
  const country = searchParams.get("country") || COUNTRIES[0].code
  const symbol = getCurrencySymbolForCountry(country)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [entries, setEntries] = useState<WalletLedgerEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    const { data, error } = await driverFinancialsService.getDriverWalletLedger(driverId)
    setEntries(data)
    setError(error)
    setLoading(false)
    setRefreshing(false)
  }, [driverId])

  useEffect(() => {
    if (!admin) return
    setLoading(true)
    load()
  }, [admin, load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
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
        <Link
          href="/operations/dashboard/financials"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to financials
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Wallet history</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{driverName}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Every wallet top-up and 5% commission deduction, with the running balance after each.</p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && <p className="mb-6 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">Loading wallet history…</p>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
            <p className="text-sm font-semibold text-[var(--muted)]">No wallet activity yet for this driver.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map((entry) => {
              const isCredit = entry.payment_method === "orange_money"
              const balanceAfter = entry.metadata?.balance_after
              return (
                <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                      isCredit ? "bg-[#4CAF5020]" : "bg-[#F4433620]"
                    }`}
                  >
                    {isCredit ? <WalletCards className="size-4 text-[#4CAF50]" /> : <TruckIcon className="size-4 text-[#F44336]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{isCredit ? "Wallet top-up" : "Order commission (5%)"}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{new Date(entry.created_at).toLocaleString()}</p>
                    {entry.reference && <p className="mt-0.5 text-[11px] text-[var(--muted)]">{entry.reference}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold ${isCredit ? "text-[#4CAF50]" : "text-[#F44336]"}`}>
                      {isCredit ? "+" : ""}
                      {money(entry.amount, symbol)}
                    </p>
                    {balanceAfter !== undefined && <p className="mt-0.5 text-[11px] text-[var(--muted)]">balance: {money(balanceAfter, symbol)}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
