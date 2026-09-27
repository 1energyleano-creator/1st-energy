"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { LOCATION_TYPE_CHOICES, locationsService, type LocationRow, type LocationType } from "@/lib/locations-service"

type Props = {
  country: string
  location: LocationRow | null
  sortOrderForNew: number
  onClose: () => void
  onSaved: () => void
}

export function LocationFormModal({ country, location, sortOrderForNew, onClose, onSaved }: Props) {
  const [name, setName] = useState(location?.name || "")
  const [type, setType] = useState<LocationType>(location?.type || "city")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError("Location name is required.")
      return
    }

    setSaving(true)
    setError(null)

    const result = location
      ? await locationsService.updateLocation(location, { name, type })
      : await locationsService.createLocation({ name, type, sortOrder: sortOrderForNew, country })

    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">{location ? "Edit location" : "New location"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Gaborone"
            className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
          />
        </label>

        <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Type</span>
        <div className="mb-5 flex gap-2">
          {LOCATION_TYPE_CHOICES.map((choice) => (
            <button
              key={choice.id}
              onClick={() => setType(choice.id)}
              className={`flex-1 rounded-xl border py-2.5 text-xs font-bold ${
                type === choice.id
                  ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {choice.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 text-xs font-semibold text-[#e0553f]">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-[var(--dark)] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : location ? "Save changes" : "Create location"}
        </button>
      </div>
    </div>
  )
}
