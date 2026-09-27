"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, ChevronRight, RefreshCw, Users, Wallet, WalletCards } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import { driverFinancialsService, type DriverFinancials, type FinancialsPeriod } from "@/lib/driver-financials-service"

const PERIODS: { id: FinancialsPeriod; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "all", label: "All Time" },
]

function money(n: number, symbol = "") {
  return `${symbol}${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default function DriverFinancialsPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [period, setPeriod] = useState<FinancialsPeriod>("month")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [financials, setFinancials] = useState<DriverFinancials | null>(null)
  const [error, setError] = useState<string | null>(null)

  const symbol = getCurrencySymbolForCountry(country)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    const { data, error } = await driverFinancialsService.getDriverFinancials(period, country)
    setFinancials(data)
    setError(error)
    setLoading(false)
    setRefreshing(false)
  }, [period, country])

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
        <Link href="/operations/dashboard/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to analytics
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Finance</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Driver Financials</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              How much the company earned in commission, how much cash has been credited into driver wallets, and how much each
              driver has earned and has left before their wallet runs out.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                period === p.id ? "bg-[var(--orange)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-6 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#4CAF5020]">
              <Building2 className="size-5 text-[#4CAF50]" />
            </div>
            <p className="text-xl font-semibold tracking-[-0.02em]">{loading ? "—" : money(financials?.companyRevenue ?? 0, symbol)}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Company Revenue</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">5% commission earned</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#2196F320]">
              <Wallet className="size-5 text-[#2196F3]" />
            </div>
            <p className="text-xl font-semibold tracking-[-0.02em]">{loading ? "—" : money(financials?.totalCreditedToDrivers ?? 0, symbol)}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Credited to Drivers</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">wallet top-ups this period</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#FF980020]">
              <WalletCards className="size-5 text-[#FF9800]" />
            </div>
            <p className="text-xl font-semibold tracking-[-0.02em]">{loading ? "—" : money(financials?.totalDriverEarnings ?? 0, symbol)}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Total Driver Earnings</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">all-time, all drivers</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#9C27B020]">
              <Users className="size-5 text-[#9C27B0]" />
            </div>
            <p className="text-xl font-semibold tracking-[-0.02em]">{loading ? "—" : financials?.driverCount ?? 0}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Drivers</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">{loading ? "—" : `${financials?.activeDriverCount ?? 0} active`}</p>
          </article>
        </div>

        {/* Per-driver breakdown */}
        <section className="mt-6">
          <h2 className="mb-3 text-base font-bold">Per-Driver Breakdown</h2>
          {loading ? (
            <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">Loading…</p>
          ) : !financials || financials.drivers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
              <p className="text-sm font-semibold text-[var(--muted)]">No driver activity in this period.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {financials.drivers.map((d) => {
                const barColor = d.percentRemaining > 40 ? "#4CAF50" : d.percentRemaining > 15 ? "#FF9800" : "#F44336"
                return (
                  <Link
                    key={d.driverId}
                    href={`/operations/dashboard/financials/${d.driverId}?name=${encodeURIComponent(d.name)}&country=${country}`}
                    className="rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--orange)]/40"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-sm font-bold text-white">
                        {d.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{d.name}</p>
                        <p className="text-xs text-[var(--muted)]">{d.totalOrders} orders</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          d.isActive ? "bg-[#4CAF5020] text-[#4CAF50]" : "bg-[#75757520] text-[#757575]"
                        }`}
                      >
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[11px] text-[var(--muted)]">Credited</p>
                        <p className="mt-0.5 text-sm font-bold">{money(d.credited, symbol)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[var(--muted)]">Commission Paid</p>
                        <p className="mt-0.5 text-sm font-bold text-[var(--orange)]">{money(d.commissionPaid, symbol)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[var(--muted)]">Total Earned</p>
                        <p className="mt-0.5 text-sm font-bold text-[#4CAF50]">{money(d.totalEarnings, symbol)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-xs text-[var(--muted)]">Wallet balance remaining</p>
                        <p className="text-xs font-bold">{money(d.balance, symbol)}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F0F0F0]">
                        <div className="h-full rounded-full" style={{ width: `${d.percentRemaining}%`, backgroundColor: barColor }} />
                      </div>
                      <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                        {d.percentRemaining}% left of what was credited this period · counts down 5% per accepted order
                      </p>
                    </div>

                    <p className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[var(--orange)]">
                      See full wallet history <ChevronRight className="size-3.5" />
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
