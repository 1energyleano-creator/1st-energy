"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Package,
  RefreshCw,
  Share2,
  Truck,
  UserPlus,
} from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import { analyticsService, emptyAnalytics, type AnalyticsData, type AnalyticsPeriod, type TopDriver } from "@/lib/analytics-service"
import { analyticsExportService } from "@/lib/analytics-export"
import { RevenueLineChart } from "@/components/analytics/revenue-line-chart"
import { StatusPieChart } from "@/components/analytics/status-pie-chart"

const PERIODS: { id: AnalyticsPeriod; label: string; icon: typeof CalendarDays }[] = [
  { id: "week", label: "Week", icon: CalendarDays },
  { id: "month", label: "Month", icon: CalendarDays },
  { id: "quarter", label: "Quarter", icon: CalendarRange },
  { id: "year", label: "Year", icon: CalendarRange },
]

type ExportType = "pdf" | "excel" | "share"

export default function AnalyticsPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [period, setPeriod] = useState<AnalyticsPeriod>("month")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<AnalyticsData>(emptyAnalytics)
  const [topDrivers, setTopDrivers] = useState<TopDriver[]>([])
  const [error, setError] = useState<string | null>(null)
  const [exportingType, setExportingType] = useState<ExportType | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const symbol = getCurrencySymbolForCountry(country)

  const load = useCallback(async () => {
    const [analyticsRes, driversRes] = await Promise.all([
      analyticsService.getAnalytics(period, country),
      analyticsService.getTopDrivers(5, country),
    ])

    if (analyticsRes.data) {
      setData(analyticsRes.data)
      setError(null)
    } else {
      setData(emptyAnalytics)
      setError(analyticsRes.error)
    }
    setTopDrivers(driversRes.data)

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

  async function handleExport(type: ExportType) {
    if (exportingType) return
    setExportingType(type)
    setExportError(null)
    setShareCopied(false)
    try {
      if (type === "pdf") {
        analyticsExportService.exportPDF(data, period, symbol)
      } else if (type === "excel") {
        analyticsExportService.exportExcel(data, period)
      } else {
        const result = await analyticsExportService.shareSummary(data, period, symbol)
        if (result === "copied") setShareCopied(true)
      }
    } catch (err) {
      console.error(`Error exporting analytics (${type}):`, err)
      setExportError("Couldn't export the report. Please try again.")
    } finally {
      setExportingType(null)
    }
  }

  const totalRevenue = data.revenue.data.reduce((a, b) => a + b, 0)
  const activeDrivers = data.drivers.find((d) => d.name === "Active")?.population || 0

  const metrics = [
    {
      id: "revenue",
      label: "Total Revenue",
      value: `${symbol}${totalRevenue.toLocaleString()}`,
      icon: Banknote,
      color: "#4CAF50",
      href: "/operations/dashboard/financials",
    },
    {
      id: "orders",
      label: "Total Orders",
      value: `${data.totalOrdersCount || 0}`,
      icon: Package,
      color: "#2196F3",
      href: "/operations/dashboard/orders",
    },
    {
      id: "drivers",
      label: "Active Drivers",
      value: `${activeDrivers}`,
      icon: Truck,
      color: "#FF9800",
      href: "/operations/dashboard/drivers",
    },
    {
      id: "customers",
      label: "New Customers",
      value: `${data.customers.newThisPeriod || 0}`,
      icon: UserPlus,
      color: "#9C27B0",
      href: "/operations/dashboard/customers",
    },
    {
      id: "completion",
      label: "Completion Rate",
      value: `${data.completionRate || 0}%`,
      icon: CheckCircle2,
      color: "#00BCD4",
      href: "/operations/dashboard/orders",
    },
  ]

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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Insights</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Analytics Dashboard</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Revenue, orders, drivers and customer trends for the selected country and period.</p>
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

        {/* Period selector */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--muted)]">Time period:</span>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                period === p.id ? "bg-[var(--orange)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              <p.icon className="size-3.5" />
              {p.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-6 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {/* Driver financials shortcut */}
        <Link
          href="/operations/dashboard/financials"
          className="mb-6 flex items-center gap-4 rounded-2xl bg-[var(--dark)] p-4 text-white transition hover:opacity-95"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Banknote className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Driver Financials</p>
            <p className="mt-0.5 text-xs text-white/75">Company revenue, driver credits, earnings &amp; wallet balances</p>
          </div>
          <ArrowLeft className="size-4 rotate-180" />
        </Link>

        {/* Key metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <Link
              key={metric.id}
              href={metric.href}
              className="rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:border-[var(--orange)]/40"
            >
              <div
                className="mb-3 flex size-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${metric.color}20` }}
              >
                <metric.icon className="size-5" style={{ color: metric.color }} />
              </div>
              <p className="text-xl font-semibold tracking-[-0.02em]">{loading ? "—" : metric.value}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{metric.label}</p>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {/* Revenue trend */}
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Revenue Trend</h2>
              <Link href="/operations/dashboard/financials" className="text-xs font-bold text-[var(--orange)]">
                View More
              </Link>
            </div>
            {loading ? (
              <p className="py-16 text-center text-sm text-[var(--muted)]">Loading…</p>
            ) : data.revenue.data.length === 0 ? (
              <p className="py-16 text-center text-sm text-[var(--muted)]">No revenue data for this period yet.</p>
            ) : (
              <RevenueLineChart labels={data.revenue.labels} data={data.revenue.data} formatValue={(v) => `${symbol}${v.toLocaleString()}`} />
            )}
          </section>

          {/* Status distribution */}
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-base font-bold">Order Status Distribution</h2>
            {loading ? (
              <p className="py-16 text-center text-sm text-[var(--muted)]">Loading…</p>
            ) : data.statusDistribution.length === 0 ? (
              <p className="py-16 text-center text-sm text-[var(--muted)]">No orders in this period yet.</p>
            ) : (
              <StatusPieChart slices={data.statusDistribution} />
            )}
          </section>

          {/* Top products */}
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-base font-bold">Top Products</h2>
            {loading ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">Loading…</p>
            ) : data.topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">No product sales for this period yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[11px] font-bold">
                      #{index + 1}
                    </span>
                    <span className="w-28 shrink-0 truncate text-sm">{product.name}</span>
                    <div className="h-2 flex-1 rounded-full bg-[#F0F0F0]">
                      <div
                        className="h-full rounded-full bg-[var(--orange)]"
                        style={{ width: `${(product.sales / data.topProducts[0].sales) * 100}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[var(--orange)]">{product.sales} orders</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Peak hours */}
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-base font-bold">Peak Order Hours</h2>
            {loading ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">Loading…</p>
            ) : (
              <div className="flex h-36 items-end gap-1 overflow-x-auto pb-1">
                {data.peakHours.map((hour, index) => {
                  const max = Math.max(...data.peakHours.map((h) => h.orders), 1)
                  return (
                    <div key={index} className="flex min-w-[22px] flex-1 flex-col items-center gap-1">
                      <span className="text-[9px] font-semibold text-[var(--ink)]">{hour.orders}</span>
                      <div className="flex h-20 w-2 items-end rounded-full bg-[#F0F0F0]">
                        <div
                          className="w-full rounded-full bg-[var(--orange)]"
                          style={{ height: `${(hour.orders / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-[var(--muted)]">{hour.hour}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Driver performance */}
        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Driver Performance</h2>
            <Link href="/operations/dashboard/drivers" className="text-xs font-bold text-[var(--orange)]">
              View More
            </Link>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Loading…</p>
          ) : topDrivers.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">No driver earnings data yet.</p>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {topDrivers.map((driver, index) => (
                <div key={index} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-sm font-bold text-white">
                      {driver.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{driver.name}</p>
                      <p className="text-xs text-[var(--muted)]">{driver.trips} trips</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">
                      {symbol}
                      {driver.earnings.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">Earnings</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Export */}
        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="mb-4 text-base font-bold">Export Analytics</h2>
          {exportError && <p className="mb-3 rounded-xl bg-[#fdeceb] px-3 py-2 text-xs font-semibold text-[#e0553f]">{exportError}</p>}
          {shareCopied && <p className="mb-3 rounded-xl bg-[#e7f7ef] px-3 py-2 text-xs font-semibold text-[#10B981]">Summary copied to clipboard.</p>}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={!!exportingType}
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-2 rounded-xl bg-[#F5F5F5] px-4 py-2.5 text-xs font-bold text-[var(--ink)] disabled:opacity-60"
            >
              {exportingType === "pdf" ? <Loader2 className="size-4 animate-spin text-[#F44336]" /> : <FileDown className="size-4 text-[#F44336]" />}
              PDF Report
            </button>
            <button
              disabled={!!exportingType}
              onClick={() => handleExport("excel")}
              className="flex items-center gap-2 rounded-xl bg-[#F5F5F5] px-4 py-2.5 text-xs font-bold text-[var(--ink)] disabled:opacity-60"
            >
              {exportingType === "excel" ? <Loader2 className="size-4 animate-spin text-[#4CAF50]" /> : <FileSpreadsheet className="size-4 text-[#4CAF50]" />}
              Export Data (CSV)
            </button>
            <button
              disabled={!!exportingType}
              onClick={() => handleExport("share")}
              className="flex items-center gap-2 rounded-xl bg-[#F5F5F5] px-4 py-2.5 text-xs font-bold text-[var(--ink)] disabled:opacity-60"
            >
              {exportingType === "share" ? <Loader2 className="size-4 animate-spin text-[#2196F3]" /> : <Share2 className="size-4 text-[#2196F3]" />}
              Share
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
