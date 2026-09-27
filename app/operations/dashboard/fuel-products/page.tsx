"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Droplet, MapPin, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import { fuelProductsService, type FuelProduct } from "@/lib/fuel-products-service"
import { FuelProductFormModal } from "@/components/fuel-products/fuel-product-form-modal"

export default function FuelProductsPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [products, setProducts] = useState<FuelProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FuelProduct | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fuelProductsService.getAllFuelProducts(country)
    setProducts(data)
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  async function handleToggleAvailable(product: FuelProduct) {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, available: !p.available } : p)))
    const { error } = await fuelProductsService.toggleAvailable(product)
    if (error) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, available: product.available } : p)))
      setError(error)
    }
  }

  async function handleDelete(product: FuelProduct) {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return
    const { error } = await fuelProductsService.deleteFuelProduct(product.id)
    if (error) return setError(error)
    setProducts((prev) => prev.filter((p) => p.id !== product.id))
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Emergency delivery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Fuel Products</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Petrol and diesel options customers see in Emergency Delivery. Separate from the main product catalog.
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
            <Link
              href="/operations/dashboard/emergency-depot"
              className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <MapPin className="size-4" />
              Emergency depot
            </Link>
            <Link
              href="/operations/dashboard/emergency-prices"
              className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <AlertTriangle className="size-4" />
              Emergency prices
            </Link>
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="flex items-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3 text-xs font-bold text-white"
            >
              <Plus className="size-4" />
              Add fuel product
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
            Loading fuel products…
          </p>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
            <Droplet className="mx-auto mb-3 size-10 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">No fuel products yet</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Customers won&apos;t see any fuel options in Emergency Delivery until you add petrol or diesel here.
            </p>
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="mt-4 rounded-xl bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white"
            >
              Add your first fuel product
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <div key={product.id} className="flex overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                <img src={product.image} alt={product.title} className="h-auto w-24 shrink-0 object-cover" />
                <div className="flex-1 p-4">
                  <span className="mb-1 inline-block rounded bg-[#fff1e8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--orange)]">
                    {product.category}
                  </span>
                  <p className="truncate text-sm font-bold">{product.title || "Untitled"}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {symbol}
                    {Number(product.price).toFixed(2)} / litre
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--muted)]">
                      <button
                        role="switch"
                        aria-checked={product.available}
                        onClick={() => handleToggleAvailable(product)}
                        className={`relative h-5 w-9 rounded-full transition ${product.available ? "bg-[var(--orange)]" : "bg-[#e2e8f0]"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-4 rounded-full bg-white transition ${product.available ? "left-4" : "left-0.5"}`}
                        />
                      </button>
                      {product.available ? "Available" : "Unavailable"}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditing(product)
                          setFormOpen(true)
                        }}
                        aria-label="Edit fuel product"
                        className="text-[var(--muted)] hover:text-[var(--ink)]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => handleDelete(product)} aria-label="Delete fuel product" className="text-[#e0553f]">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <FuelProductFormModal
          country={country}
          product={editing}
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
