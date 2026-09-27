"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, MapPin, Phone, RefreshCw, Search, User, UserPlus, Users } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES } from "@/lib/countries"
import { customersService, type Customer, type CustomerStats } from "@/lib/customers-service"
import { CustomerDetailsModal } from "@/components/customers/customer-details-modal"

export default function CustomersPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats>({ totalCustomers: 0, newThisMonth: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Customer | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await customersService.getAllCustomers(country)
    setCustomers(data)
    setStats(customersService.getCustomerStats(data))
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone_number?.toLowerCase().includes(query) ||
        c.city?.toLowerCase().includes(query),
    )
  }, [customers, search])

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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Customers</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Customers</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              The same customer accounts drivers and customers see in the app, per country.
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--muted)]">Total customers</p>
              <Users className="size-4 text-[var(--orange)]" />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.totalCustomers}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--muted)]">New this month</p>
              <UserPlus className="size-4 text-[#3B82F6]" />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.newThisMonth}</p>
          </article>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, city…"
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)]"
            />
          </div>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {filtered.length} of {customers.length} customer{customers.length === 1 ? "" : "s"}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>
        )}

        <div className="mt-6">
          {loading ? (
            <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
              Loading customers…
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
              <p className="text-sm font-semibold text-[var(--muted)]">No customers found</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {search ? "Try a different search." : "No customers yet for this country."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              <ul className="divide-y divide-[var(--line)]">
                {filtered.map((customer) => (
                  <li key={customer.id}>
                    <button
                      onClick={() => setSelected(customer)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#fafaf7]"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-sm font-bold text-white">
                        {(customer.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{customer.name || "Unnamed customer"}</span>
                        {customer.email && (
                          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--muted)]">
                            <Mail className="size-3" /> {customer.email}
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap gap-3">
                          {customer.phone_number && (
                            <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                              <Phone className="size-3" /> {customer.phone_number}
                            </span>
                          )}
                          {customer.city && (
                            <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                              <MapPin className="size-3" /> {customer.city}
                            </span>
                          )}
                        </span>
                      </span>
                      <User className="size-4 shrink-0 text-[var(--muted)]" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {selected && <CustomerDetailsModal customer={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}
