'use client'

import { useEffect, useState } from 'react'
import { Clock, PackageCheck, RefreshCcw, Truck, Wallet } from 'lucide-react'
import { COUNTRIES, CURRENCY_SYMBOLS } from '@/lib/countries'
import { getCountryDashboardStats, type CountryStats } from '@/lib/country-dashboard-stats'

function formatAmount(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CountryStatsGrid() {
  const [stats, setStats] = useState<CountryStats[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await getCountryDashboardStats()
    if (error) setError('Some figures could not be loaded. Showing what is available.')
    setStats(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold">Countries overview</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Today's revenue, orders, pending and active drivers, per country and currency</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 self-start rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[#f5f7fb] disabled:opacity-60"
        >
          <RefreshCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {COUNTRIES.map((country) => {
          const stat = stats?.find((s) => s.code === country.code)
          const symbol = CURRENCY_SYMBOLS[country.currency] || ''

          return (
            <article key={country.code} className="rounded-2xl border border-[var(--line)] bg-[#fafaf7] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{country.name}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{country.currency}</p>
                </div>
                <span className="rounded-full bg-[#ebe8df] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)]">{country.code}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-3">
                  <div className="mb-2 flex size-7 items-center justify-center rounded-lg bg-[#e7f7ef]">
                    <Wallet className="size-4 text-[#10B981]" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Today revenue</p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                    {loading && !stats ? '—' : `${symbol}${formatAmount(stat?.todayRevenue ?? 0)}`}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <div className="mb-2 flex size-7 items-center justify-center rounded-lg bg-[#e9f1fe]">
                    <PackageCheck className="size-4 text-[#3B82F6]" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Total orders</p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">{loading && !stats ? '—' : stat?.totalOrders ?? 0}</p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <div className="mb-2 flex size-7 items-center justify-center rounded-lg bg-[#fef3e2]">
                    <Clock className="size-4 text-[#F59E0B]" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Pending</p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">{loading && !stats ? '—' : stat?.pendingOrders ?? 0}</p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <div className="mb-2 flex size-7 items-center justify-center rounded-lg bg-[#ffece3]">
                    <Truck className="size-4 text-[var(--orange)]" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Active drivers</p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                    {loading && !stats ? '—' : `${stat?.activeDrivers ?? 0}/${stat?.totalDrivers ?? 0}`}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
