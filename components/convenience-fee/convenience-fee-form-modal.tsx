"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { getCurrencySymbolForCountry } from "@/lib/countries"
import type { Category } from "@/lib/categories-service"
import type { LocationRow } from "@/lib/locations-service"
import { convenienceFeeService, DEFAULT_CONVENIENCE_FEE, type ConvenienceFee } from "@/lib/convenience-fee-service"

// Sentinel used in the location picker for "this fee applies to every
// town/city/village in the country for this category" — kept separate
// from `null` in component state since a picker option needs a string id.
const ALL_LOCATIONS_ID = "__all__"

type Props = {
  country: string
  categories: Category[]
  locations: LocationRow[]
  fee: ConvenienceFee | null
  onClose: () => void
  onSaved: () => void
}

export function ConvenienceFeeFormModal({ country, categories, locations, fee, onClose, onSaved }: Props) {
  const [category, setCategory] = useState<string | null>(fee?.category || categories[0]?.name || null)
  const [locationInput, setLocationInput] = useState(fee?.location || ALL_LOCATIONS_ID)
  const [feeInput, setFeeInput] = useState(fee ? String(fee.fee) : String(DEFAULT_CONVENIENCE_FEE))
  const [active, setActive] = useState(fee?.active !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const symbol = getCurrencySymbolForCountry(country)

  async function handleSave() {
    if (!category) {
      setError("Please choose a category for this fee.")
      return
    }
    const numericFee = Number(feeInput)
    if (feeInput.trim() === "" || Number.isNaN(numericFee) || numericFee < 0) {
      setError("Please enter a valid, non-negative amount.")
      return
    }

    const resolvedLocation = locationInput === ALL_LOCATIONS_ID ? null : locationInput

    setSaving(true)
    setError(null)
    const { error } = await convenienceFeeService.setFee(country, category, numericFee, resolvedLocation, active)
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
          <h2 className="text-lg font-bold text-[var(--ink)]">{fee ? "Edit convenience fee" : "New convenience fee"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Category</span>
          {categories.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No categories found for this country yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.name)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    category === cat.name
                      ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                      : "border-[var(--line)] bg-[#fafafa] text-[var(--muted)]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </label>

        <label className="mb-1 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Location</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setLocationInput(ALL_LOCATIONS_ID)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                locationInput === ALL_LOCATIONS_ID
                  ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                  : "border-[var(--line)] bg-[#fafafa] text-[var(--muted)]"
              }`}
            >
              All locations
            </button>
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setLocationInput(loc.name)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  locationInput === loc.name
                    ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                    : "border-[var(--line)] bg-[#fafafa] text-[var(--muted)]"
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </label>
        <p className="mb-4 text-[11px] text-[var(--muted)]">
          Leave &ldquo;All locations&rdquo; selected to set one fee for this category across the whole country.
        </p>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Fee amount ({symbol})</span>
          <input
            value={feeInput}
            onChange={(e) => setFeeInput(e.target.value)}
            placeholder="e.g. 5.00"
            inputMode="decimal"
            className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
          />
        </label>

        <div className="mb-5 flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold text-[var(--muted)]">Charge this fee</span>
            <span className="block text-[11px] text-[var(--muted)]">Turn off to stop charging without losing the amount.</span>
          </div>
          <button
            role="switch"
            aria-checked={active}
            onClick={() => setActive((v) => !v)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition ${active ? "bg-[var(--orange)]" : "bg-[#e2e8f0]"}`}
          >
            <span className={`absolute top-0.5 size-4 rounded-full bg-white transition ${active ? "left-4" : "left-0.5"}`} />
          </button>
        </div>

        {error && <p className="mb-3 text-xs font-semibold text-[#e0553f]">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-[var(--dark)] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save fee"}
        </button>
      </div>
    </div>
  )
}
