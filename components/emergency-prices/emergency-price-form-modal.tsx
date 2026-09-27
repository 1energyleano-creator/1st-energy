"use client"

import { useState } from "react"
import { X } from "lucide-react"
import {
  EMERGENCY_PRICE_CATEGORIES,
  emergencyPricesService,
  type EmergencyPrice,
} from "@/lib/emergency-prices-service"

type Props = {
  country: string
  price: EmergencyPrice | null
  onClose: () => void
  onSaved: () => void
}

export function EmergencyPriceFormModal({ country, price, onClose, onSaved }: Props) {
  const [category, setCategory] = useState(price?.category || EMERGENCY_PRICE_CATEGORIES[0])
  const [available, setAvailable] = useState(price?.available !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error } = await emergencyPricesService.saveEmergencyPrice({ category, available }, country, price)
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
          <h2 className="text-lg font-bold text-[var(--ink)]">{price ? "Edit entry" : "New entry"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Category *</span>
          <div className="flex gap-2">
            {EMERGENCY_PRICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-bold ${
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
          {saving ? "Saving…" : "Save entry"}
        </button>
      </div>
    </div>
  )
}
