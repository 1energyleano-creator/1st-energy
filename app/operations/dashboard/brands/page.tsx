"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Fuel, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES } from "@/lib/countries"
import { brandsService, type Brand } from "@/lib/brands-service"
import { BrandFormModal } from "@/components/brands/brand-form-modal"

export default function BrandsPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await brandsService.getAllBrands(country)
    setBrands(data)
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  async function handleToggleActive(brand: Brand) {
    setBrands((prev) => prev.map((b) => (b.id === brand.id ? { ...b, is_active: !b.is_active } : b)))
    const { error } = await brandsService.toggleActive(brand)
    if (error) {
      setBrands((prev) => prev.map((b) => (b.id === brand.id ? { ...b, is_active: brand.is_active } : b)))
      setError(error)
    }
  }

  async function handleDelete(brand: Brand) {
    if (
      !confirm(
        `Delete "${brand.name}"? This removes it completely — if you just want to hide it from customers for now, turn it off instead.`,
      )
    )
      return
    const { error } = await brandsService.deleteBrand(brand.id)
    if (error) return setError(error)
    setBrands((prev) => prev.filter((b) => b.id !== brand.id))
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
        <Link href="/operations/dashboard/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to products
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Catalog</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Gas Brands</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Turn a brand off to hide it from customers buying gas in this country. It&apos;s fine to turn every
              brand off — customers can still buy gas without picking one.
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
              Add brand
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
            Loading brands…
          </p>
        ) : brands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
            <Fuel className="mx-auto mb-3 size-10 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">No brands yet for this country</p>
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="mt-4 rounded-xl bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white"
            >
              Add your first brand
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {brands.map((brand) => (
              <li key={brand.id} className="flex overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                <div className="flex w-16 shrink-0 items-center justify-center bg-[#fff1e8]">
                  <Fuel className="size-5 text-[var(--orange)]" />
                </div>
                <div className="flex-1 p-4">
                  <p className="truncate text-sm font-bold">{brand.name}</p>
                  {brand.description && <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{brand.description}</p>}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--muted)]">
                      <button
                        role="switch"
                        aria-checked={brand.is_active}
                        onClick={() => handleToggleActive(brand)}
                        className={`relative h-5 w-9 rounded-full transition ${brand.is_active ? "bg-[var(--orange)]" : "bg-[#e2e8f0]"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-4 rounded-full bg-white transition ${brand.is_active ? "left-4" : "left-0.5"}`}
                        />
                      </button>
                      {brand.is_active ? "Visible to customers" : "Hidden from customers"}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditing(brand)
                          setFormOpen(true)
                        }}
                        aria-label="Edit brand"
                        className="text-[var(--muted)] hover:text-[var(--ink)]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => handleDelete(brand)} aria-label="Delete brand" className="text-[#e0553f]">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <BrandFormModal
          country={country}
          brand={editing}
          existingBrands={brands}
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
