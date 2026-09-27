"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { brandsService, type Brand } from "@/lib/brands-service"

type Props = {
  country: string
  brand: Brand | null
  existingBrands: Brand[]
  onClose: () => void
  onSaved: () => void
}

export function BrandFormModal({ country, brand, existingBrands, onClose, onSaved }: Props) {
  const [name, setName] = useState(brand?.name || "")
  const [description, setDescription] = useState(brand?.description || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error } = await brandsService.saveBrand({ name, description }, country, existingBrands, brand)
    setSaving(false)
    if (error) return setError(error)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">{brand ? "Edit brand" : "New brand"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Name *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Tswana Gas"'
            className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            rows={3}
            className="w-full rounded-xl border border-[var(--line)] p-3 text-sm outline-none focus:border-[var(--orange)]"
          />
        </label>

        {error && <p className="mb-3 text-xs font-semibold text-[#e0553f]">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-[var(--dark)] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save brand"}
        </button>
      </div>
    </div>
  )
}
