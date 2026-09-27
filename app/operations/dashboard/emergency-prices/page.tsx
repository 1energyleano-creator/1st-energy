"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES } from "@/lib/countries"
import { emergencyPricesService, type EmergencyPrice } from "@/lib/emergency-prices-service"
import { EmergencyPriceFormModal } from "@/components/emergency-prices/emergency-price-form-modal"

export default function EmergencyPricesPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [prices, setPrices] = useState<EmergencyPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EmergencyPrice | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await emergencyPricesService.getAllEmergencyPrices(country)
    setPrices(data)
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  async function handleToggleAvailable(price: EmergencyPrice) {
    setPrices((prev) => prev.map((p) => (p.id === price.id ? { ...p, available: !p.available } : p)))
    const { error } = await emergencyPricesService.toggleAvailable(price)
    if (error) {
      setPrices((prev) => prev.map((p) => (p.id === price.id ? { ...p, available: price.available } : p)))
      setError(error)
    }
  }

  async function handleDelete(price: EmergencyPrice) {
    if (!confirm(`Delete "${price.category}"? This cannot be undone.`)) return
    const { error } = await emergencyPricesService.deleteEmergencyPrice(price.id)
    if (error) return setError(error)
    setPrices((prev) => prev.filter((p) => p.id !== price.id))
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
        <Link href="/operations/dashboard/fuel-products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to fuel products
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Emergency delivery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Emergency Prices</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Turn petrol and diesel on or off for this country&apos;s Emergency Delivery screen. Per-litre prices
              still come from Fuel Products.
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
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="flex items-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3 text-xs font-bold text-white"
            >
              <Plus className="size-4" />
              Add entry
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
            Loading emergency prices…
          </p>
        ) : prices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
            <AlertTriangle className="mx-auto mb-3 size-10 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">No emergency price entries yet</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Add categories here so this country&apos;s Emergency screen has pricing entries to show.
            </p>
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="mt-4 rounded-xl bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white"
            >
              Add your first entry
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {prices.map((price) => (
              <div key={price.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <p className="text-sm font-bold">{price.category || "Untitled"}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--muted)]">
                    <button
                      role="switch"
                      aria-checked={price.available}
                      onClick={() => handleToggleAvailable(price)}
                      className={`relative h-5 w-9 rounded-full transition ${price.available ? "bg-[var(--orange)]" : "bg-[#e2e8f0]"}`}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full bg-white transition ${price.available ? "left-4" : "left-0.5"}`}
                      />
                    </button>
                    {price.available ? "Available" : "Unavailable"}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditing(price)
                        setFormOpen(true)
                      }}
                      aria-label="Edit entry"
                      className="text-[var(--muted)] hover:text-[var(--ink)]"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => handleDelete(price)} aria-label="Delete entry" className="text-[#e0553f]">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <EmergencyPriceFormModal
          country={country}
          price={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            load()
          }}
        />
      )}
    </main>
  )
}
