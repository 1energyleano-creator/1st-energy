"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { getCurrencyForCountry } from "@/lib/countries"
import { FUEL_CATEGORIES, fuelProductsService, type FuelCategory, type FuelProduct } from "@/lib/fuel-products-service"

type Props = {
  country: string
  product: FuelProduct | null
  onClose: () => void
  onSaved: () => void
}

export function FuelProductFormModal({ country, product, onClose, onSaved }: Props) {
  const [category, setCategory] = useState<FuelCategory>(product?.category || FUEL_CATEGORIES[0])
  const [title, setTitle] = useState(product?.title || "")
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "")
  const [image, setImage] = useState(product?.image || "")
  const [available, setAvailable] = useState(product?.available !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error } = await fuelProductsService.saveFuelProduct(
      { title, category, price, image, available },
      country,
      product,
    )
    setSaving(false)
    if (error) return setError(error)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">{product ? "Edit fuel product" : "New fuel product"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Category *</span>
          <div className="flex gap-2">
            {FUEL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-bold capitalize ${
                  category === cat
                    ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </label>

        <label className="mb-1 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Title *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "Petrol 95" or "Diesel"'
            className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
          />
        </label>
        <p className="mb-4 text-[11px] text-[var(--muted)]">
          Put the grade in the title (e.g. &ldquo;Petrol 95&rdquo;) — there&apos;s no separate brand field for fuel.
        </p>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">
            Price per litre ({getCurrencyForCountry(country)}) *
          </span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 16.05"
            inputMode="decimal"
            className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Image URL *</span>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://…"
            className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
          />
        </label>

        <div className="mb-5 flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--muted)]">Available</span>
          <button
            role="switch"
            aria-checked={available}
            onClick={() => setAvailable((v) => !v)}
            className={`relative h-5 w-9 rounded-full transition ${available ? "bg-[var(--orange)]" : "bg-[#e2e8f0]"}`}
          >
            <span className={`absolute top-0.5 size-4 rounded-full bg-white transition ${available ? "left-4" : "left-0.5"}`} />
          </button>
        </div>

        {error && <p className="mb-3 text-xs font-semibold text-[#e0553f]">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-[var(--dark)] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save fuel product"}
        </button>
      </div>
    </div>
  )
}
