"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calculator,
  Droplet,
  Fuel,
  GalleryHorizontal,
  Grid3x3,
  Layers,
  MapPin,
  Package,
  PackageX,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
} from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import {
  productsService,
  getProductImageUrl,
  DEFAULT_CYLINDER_SIZES,
  DEFAULT_GAS_BRANDS,
  type Product,
  type Category,
  type ProductStats,
} from "@/lib/products-service"
import { ProductFormModal } from "@/components/products/product-form-modal"
import { CatalogSettingsModal } from "@/components/products/catalog-settings-modal"

export default function ProductsPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [products, setProducts] = useState<Product[]>([])
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([])
  const [stats, setStats] = useState<ProductStats>({ totalProducts: 0, availableProducts: 0, outOfStock: 0, categories: 0 })
  const [cylinderPrice, setCylinderPrice] = useState<number | null>(null)
  const [minimumOrder, setMinimumOrder] = useState(500)
  const [cylinderSizes, setCylinderSizes] = useState<string[]>(DEFAULT_CYLINDER_SIZES)
  const [gasBrands, setGasBrands] = useState<string[]>(DEFAULT_GAS_BRANDS)

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [formOpen, setFormOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: productRows }, { data: statsData }, { data: cats }, price, min, sizes, brands] = await Promise.all([
      productsService.getAllProducts(country),
      productsService.getProductStats(country),
      productsService.getCategoryOptions(country),
      productsService.getCylinderPrice(),
      productsService.getMinimumOrder(),
      productsService.getCylinderSizes(),
      productsService.getGasBrands(),
    ])
    setProducts(productRows)
    if (statsData) setStats(statsData)
    setCategoryOptions(cats)
    setCylinderPrice(price)
    setMinimumOrder(min)
    setCylinderSizes(sizes)
    setGasBrands(brands)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  const inUseCategories = useMemo(
    () => Array.from(new Set(products.map((p) => (p.category || "").trim()).filter(Boolean))).sort(),
    [products],
  )

  const filtered = useMemo(() => {
    let rows = products
    if (activeCategory !== "all") rows = rows.filter((p) => p.category === activeCategory)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      )
    }
    return rows
  }, [products, activeCategory, search])

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return
    await productsService.deleteProduct(product.id)
    load()
  }

  async function handleToggleAvailable(product: Product) {
    await productsService.setAvailability(product.id, !product.available)
    load()
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Catalog</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Products</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Add, edit and manage the fuel, gas, accessory and appliance catalog customers order from.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none">
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
            <button onClick={load} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/operations/dashboard/categories" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <Grid3x3 className="size-4" />
              Categories
            </Link>
            <Link href="/operations/dashboard/locations" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <MapPin className="size-4" />
              Locations
            </Link>
            <Link href="/operations/dashboard/brands" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <Fuel className="size-4" />
              Brands
            </Link>
            <Link href="/operations/dashboard/fuel-products" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <Droplet className="size-4" />
              Fuel
            </Link>
            <Link href="/operations/dashboard/delivery-fees" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <Calculator className="size-4" />
              Delivery fees
            </Link>
            <Link href="/operations/dashboard/convenience-fee" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <Receipt className="size-4" />
              Convenience fee
            </Link>
            <Link href="/operations/dashboard/banners" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <GalleryHorizontal className="size-4" />
              Banners
            </Link>
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <Settings2 className="size-4" />
              Settings
            </button>
            <button onClick={() => { setEditing(null); setFormOpen(true) }} className="flex items-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3 text-xs font-bold text-white">
              <Plus className="size-4" />
              Add product
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--muted)]">Total products</p><Package className="size-4 text-[var(--orange)]" /></div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.totalProducts}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--muted)]">Available</p><Package className="size-4 text-[#10B981]" /></div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.availableProducts}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--muted)]">Out of stock</p><PackageX className="size-4 text-[#e0553f]" /></div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.outOfStock}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--muted)]">Categories</p><Layers className="size-4 text-[#3B82F6]" /></div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{stats.categories}</p>
          </article>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="h-11 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)]" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveCategory("all")} className={`rounded-full px-4 py-2 text-xs font-bold transition ${activeCategory === "all" ? "bg-[var(--orange)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"}`}>All</button>
            {inUseCategories.map((c) => (
              <button key={c} onClick={() => setActiveCategory(c)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${activeCategory === c ? "bg-[var(--orange)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">Loading products…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
              <p className="text-sm font-semibold text-[var(--muted)]">No products found</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Try a different search or category, or add a new product.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => {
                const imageUrl = getProductImageUrl(product.image)
                return (
                  <article key={product.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="size-16 rounded-xl object-cover" />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-xl bg-[#f5f5f5]"><Package className="size-6 text-[var(--muted)]" /></div>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${product.available !== false ? "bg-[#e7f7ef] text-[#10B981]" : "bg-[#fdeceb] text-[#e0553f]"}`}>
                        {product.available !== false ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <p className="text-sm font-bold">{product.title}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{product.category || "Uncategorized"}{product.brand ? ` · ${product.brand}` : ""}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-lg font-semibold tracking-[-0.02em]">{symbol}{Number(product.price || 0).toFixed(2)}</p>
                      <p className="text-xs text-[var(--muted)]">Stock: {product.quantity ?? 0}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => { setEditing(product); setFormOpen(true) }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#f5f5f5] py-2 text-xs font-bold text-[var(--ink)]">
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button onClick={() => handleToggleAvailable(product)} className="flex-1 rounded-xl bg-[#f5f5f5] py-2 text-xs font-bold text-[var(--ink)]">
                        {product.available !== false ? "Mark out" : "Mark in"}
                      </button>
                      <button onClick={() => handleDelete(product)} aria-label="Delete product" className="flex items-center justify-center rounded-xl bg-[#fdeceb] px-3 text-[#e0553f]">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <ProductFormModal
          country={country}
          product={editing}
          categoryOptions={categoryOptions}
          cylinderSizes={cylinderSizes}
          gasBrands={gasBrands}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load() }}
        />
      )}

      {settingsOpen && (
        <CatalogSettingsModal
          country={country}
          cylinderPrice={cylinderPrice}
          minimumOrder={minimumOrder}
          cylinderSizes={cylinderSizes}
          gasBrands={gasBrands}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => { setSettingsOpen(false); load() }}
        />
      )}
    </main>
  )
}
