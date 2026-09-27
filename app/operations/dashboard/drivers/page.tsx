"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Car, Clock, MapPinned, RefreshCw, Search, Truck, Users } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import { driversService, isDriverTrulyActive, type Driver, type DriverStats } from "@/lib/drivers-service"
import { DriverDetailsModal } from "@/components/drivers/driver-details-modal"

const FILTERS: { key: "all" | "active" | "inactive" | "pending_review"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "pending_review", label: "Pending Review" },
]

export default function DriversPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [stats, setStats] = useState<DriverStats>({ total: 0, active: 0, pendingReview: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all")
  const [selected, setSelected] = useState<Driver | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await driversService.getAllDrivers(country)
    setDrivers(data)
    setStats(driversService.getDriverStats(data))
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  const filtered = useMemo(() => {
    let rows = drivers

    if (filter === "pending_review") {
      rows = rows.filter((d) => (d.verification_status || "pending") === "pending")
    } else if (filter !== "all") {
      const wantActive = filter === "active"
      rows = rows.filter((d) => isDriverTrulyActive(d) === wantActive)
    }

    const query = search.trim().toLowerCase()
    if (query) {
      rows = rows.filter(
        (d) =>
          d.users?.name?.toLowerCase().includes(query) ||
          d.license_number?.toLowerCase().includes(query) ||
          d.vehicle_registration?.toLowerCase().includes(query) ||
          d.city?.toLowerCase().includes(query) ||
          d.users?.phone_number?.includes(query),
      )
    }

    return rows
  }, [drivers, filter, search])

  const symbol = getCurrencySymbolForCountry(country)

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
        <div className="flex items-center gap-4">
          <Link
            href="/operations/dashboard/live-map"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white"
          >
            <MapPinned className="size-4" aria-hidden="true" />
            Live drivers map
          </Link>
          <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
            {(admin.name || "AD").slice(0, 2).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Fleet</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Drivers</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Review documents, approve or reject applicants, and manage driver availability.
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
              onClick={load}
              className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--muted)]">Total drivers</p>
              <Users className="size-4 text-[var(--orange)]" />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.total}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--muted)]">Active now</p>
              <Truck className="size-4 text-[#10B981]" />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.active}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--muted)]">Pending review</p>
              <Clock className="size-4 text-[#F59E0B]" />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.pendingReview}</p>
          </article>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, license, plate, city…"
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  filter === item.key ? "bg-[var(--orange)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>
        )}

        <div className="mt-6">
          {loading ? (
            <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
              Loading drivers…
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
              <p className="text-sm font-semibold text-[var(--muted)]">No drivers found</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((driver) => {
                const truelyActive = isDriverTrulyActive(driver)
                const status = driver.verification_status || "pending"
                return (
                  <article key={driver.user_id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="relative">
                        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--orange)] text-sm font-bold text-white">
                          {(driver.users?.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-white ${
                            truelyActive ? "bg-[#10B981]" : "bg-[#94A3B8]"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{driver.users?.name || "Unnamed driver"}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{driver.users?.email}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          status === "approved"
                            ? "bg-[#e7f7ef] text-[#10B981]"
                            : status === "rejected"
                              ? "bg-[#fdeceb] text-[#e0553f]"
                              : "bg-[#fef3e2] text-[#a15c00]"
                        }`}
                      >
                        {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending"}
                      </span>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                      <span className="flex items-center gap-1 rounded-lg bg-[#f5f7fb] px-2 py-1">
                        <Truck className="size-3" /> {driver.total_trips || 0} trips
                      </span>
                      {driver.city && (
                        <span className="flex items-center gap-1 rounded-lg bg-[#f5f7fb] px-2 py-1">{driver.city}</span>
                      )}
                    </div>

                    <div className="mb-4 flex items-center justify-between text-xs text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Car className="size-3.5" /> {driver.vehicle_type || "No vehicle"}
                        {driver.vehicle_registration ? ` · ${driver.vehicle_registration}` : ""}
                      </span>
                      <span className="font-semibold text-[var(--ink)]">
                        {symbol}
                        {Number(driver.total_earnings || 0).toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelected(driver)}
                      className="w-full rounded-xl bg-[#f5f5f5] py-2 text-xs font-bold text-[var(--ink)]"
                    >
                      View details
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <DriverDetailsModal
          driver={selected}
          adminId={admin.id}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load()
            setSelected(null)
          }}
          onDriverPatched={(userId, patch) => {
            setDrivers((current) => current.map((d) => (d.user_id === userId ? { ...d, ...patch } : d)))
          }}
        />
      )}
    </main>
  )
}
