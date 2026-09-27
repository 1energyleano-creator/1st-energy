"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import { categoriesService, type Category } from "@/lib/categories-service"
import { locationsService, type LocationRow } from "@/lib/locations-service"
import { convenienceFeeService, DEFAULT_CONVENIENCE_FEE, type ConvenienceFee } from "@/lib/convenience-fee-service"
import { ConvenienceFeeFormModal } from "@/components/convenience-fee/convenience-fee-form-modal"

export default function ConvenienceFeePage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [fees, setFees] = useState<ConvenienceFee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ConvenienceFee | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: categoryRows }, { data: locationRows }, { data: feeRows, error }] = await Promise.all([
      categoriesService.getAllCategories(country),
      locationsService.getAllLocations(country),
      convenienceFeeService.getAllFees(country),
    ])
    setCategories(categoryRows)
    setLocations(locationRows)
    setFees(feeRows)
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  async function handleToggleActive(feeRow: ConvenienceFee) {
    setTogglingId(feeRow.id)
    const { error } = await convenienceFeeService.setActive(feeRow.id, !feeRow.active)
    setTogglingId(null)
    if (error) return setError(error)
    setFees((prev) => prev.map((f) => (f.id === feeRow.id ? { ...f, active: !feeRow.active } : f)))
  }

  async function handleDelete(feeRow: ConvenienceFee) {
    const fallback = feeRow.location ? `${feeRow.category}'s "All locations" fee` : `the ${getCurrencySymbolForCountry(country)}${DEFAULT_CONVENIENCE_FEE.toFixed(2)} default`
    if (!confirm(`${feeRow.category} — ${feeRow.location || "All locations"} will fall back to ${fallback} once removed. Continue?`)) return
    const { error } = await convenienceFeeService.deleteFee(feeRow.id)
    if (error) return setError(error)
    setFees((prev) => prev.filter((f) => f.id !== feeRow.id))
  }

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
        <Link href="/operations/dashboard/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to products
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Pricing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Convenience Fee</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Set a &ldquo;Service Fee&rdquo; per category, and optionally per town, city or village. Charged once on
              every checkout order for that category. Manage the location list under{" "}
              <Link href="/operations/dashboard/locations" className="font-semibold text-[var(--orange)] hover:underline">
                Locations
              </Link>
              .
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
              Add fee
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
            Loading convenience fees…
          </p>
        ) : fees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
            <p className="text-sm font-semibold text-[var(--muted)]">
              No fees configured yet. Every category currently charges the {symbol}
              {DEFAULT_CONVENIENCE_FEE.toFixed(2)} default.
            </p>
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="mt-4 rounded-xl bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white"
            >
              Set one
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
            {fees.map((feeRow) => (
              <div key={feeRow.id} className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-bold">{feeRow.category}</p>
                  <p className="text-xs text-[var(--muted)]">{feeRow.location || "All locations"}</p>
                </div>
                <span className={`text-sm font-bold ${feeRow.active === false ? "text-[var(--muted)]" : "text-[var(--orange)]"}`}>
                  {feeRow.active === false ? "Off" : `${symbol}${Number(feeRow.fee).toFixed(2)}`}
                </span>
                <button
                  role="switch"
                  aria-checked={feeRow.active !== false}
                  onClick={() => handleToggleActive(feeRow)}
                  disabled={togglingId === feeRow.id}
                  className={`relative h-5 w-9 rounded-full transition ${feeRow.active !== false ? "bg-[var(--orange)]" : "bg-[#e2e8f0]"}`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white transition ${feeRow.active !== false ? "left-4" : "left-0.5"}`}
                  />
                </button>
                <button
                  onClick={() => {
                    setEditing(feeRow)
                    setFormOpen(true)
                  }}
                  aria-label="Edit fee"
                  className="text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  <Pencil className="size-4" />
                </button>
                <button onClick={() => handleDelete(feeRow)} aria-label="Delete fee" className="text-[#e0553f]">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <ConvenienceFeeFormModal
          country={country}
          categories={categories}
          locations={locations}
          fee={editing}
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
