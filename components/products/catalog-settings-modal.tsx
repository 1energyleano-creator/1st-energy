"use client"

import { useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { productsService } from "@/lib/products-service"
import { getCurrencySymbolForCountry } from "@/lib/countries"

type Props = {
  country: string
  cylinderPrice: number | null
  minimumOrder: number
  cylinderSizes: string[]
  gasBrands: string[]
  onClose: () => void
  onSaved: () => void
}

export function CatalogSettingsModal({ country, cylinderPrice, minimumOrder, cylinderSizes, gasBrands, onClose, onSaved }: Props) {
  const symbol = getCurrencySymbolForCountry(country)
  const [priceInput, setPriceInput] = useState(cylinderPrice != null ? String(cylinderPrice) : "")
  const [minInput, setMinInput] = useState(String(minimumOrder))
  const [sizes, setSizes] = useState(cylinderSizes)
  const [brands, setBrands] = useState(gasBrands)
  const [newSize, setNewSize] = useState("")
  const [newBrand, setNewBrand] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function addSize() {
    const size = newSize.trim().toUpperCase()
    if (!size || sizes.includes(size)) return
    setSizes([...sizes, size])
    setNewSize("")
  }
  function addBrand() {
    const brand = newBrand.trim()
    if (!brand || brands.includes(brand)) return
    setBrands([...brands, brand])
    setNewBrand("")
  }

  async function saveAll() {
    const price = Number(priceInput)
    const min = Number(minInput)
    if (!priceInput || Number.isNaN(price) || price <= 0) {
      setError("Enter a valid cylinder deposit price greater than 0.")
      return
    }
    if (!minInput || Number.isNaN(min) || min < 0) {
      setError("Enter a valid minimum order amount.")
      return
    }
    setError("")
    setSaving(true)
    try {
      await Promise.all([
        productsService.setCylinderPrice(price),
        productsService.setMinimumOrder(min),
        productsService.setCylinderSizes(sizes),
        productsService.setGasBrands(brands),
      ])
      onSaved()
    } catch (e: any) {
      setError(e?.message || "Could not save settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Catalog settings</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Cylinder deposit price</label>
              <div className="flex h-11 items-center rounded-xl border border-[var(--line)] px-3">
                <span className="mr-1 text-sm font-bold text-[var(--muted)]">{symbol}</span>
                <input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} inputMode="decimal" className="w-full text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Minimum fuel order</label>
              <div className="flex h-11 items-center rounded-xl border border-[var(--line)] px-3">
                <span className="mr-1 text-sm font-bold text-[var(--muted)]">{symbol}</span>
                <input value={minInput} onChange={(e) => setMinInput(e.target.value)} inputMode="decimal" className="w-full text-sm outline-none" />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--muted)]">Minimum order applies to petrol and diesel only — gas, accessories and appliances always go through.</p>

          <div>
            <label className="mb-2 block text-xs font-bold text-[var(--muted)]">Cylinder sizes</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <span key={s} className="flex items-center gap-1 rounded-full bg-[#f5f5f5] px-3 py-1.5 text-xs font-semibold">
                  {s}
                  <button onClick={() => setSizes(sizes.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                    <Trash2 className="size-3 text-[var(--muted)]" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="e.g. 5KG" className="h-10 flex-1 rounded-xl border border-[var(--line)] px-3 text-sm outline-none" />
              <button onClick={addSize} className="flex size-10 items-center justify-center rounded-xl bg-[#f5f5f5]"><Plus className="size-4" /></button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-[var(--muted)]">Gas brands</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {brands.map((b) => (
                <span key={b} className="flex items-center gap-1 rounded-full bg-[#f5f5f5] px-3 py-1.5 text-xs font-semibold">
                  {b}
                  <button onClick={() => setBrands(brands.filter((x) => x !== b))} aria-label={`Remove ${b}`}>
                    <Trash2 className="size-3 text-[var(--muted)]" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="e.g. Afrox" className="h-10 flex-1 rounded-xl border border-[var(--line)] px-3 text-sm outline-none" />
              <button onClick={addBrand} className="flex size-10 items-center justify-center rounded-xl bg-[#f5f5f5]"><Plus className="size-4" /></button>
            </div>
          </div>

          {error && <p className="rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="h-11 flex-1 rounded-xl bg-[#f5f5f5] text-sm font-bold text-[var(--muted)]">Cancel</button>
            <button onClick={saveAll} disabled={saving} className="h-11 flex-1 rounded-xl bg-[var(--orange)] text-sm font-bold text-white disabled:opacity-60">
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
