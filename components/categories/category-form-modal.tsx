"use client"

import { useState } from "react"
import {
  Battery,
  Box,
  Droplet,
  Grid3x3,
  Package,
  Settings,
  ShoppingBag,
  Sun,
  Truck,
  Wind,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { categoriesService, ICON_CHOICES, type Category } from "@/lib/categories-service"

const ICON_MAP: Record<string, LucideIcon> = {
  droplet: Droplet,
  wind: Wind,
  wrench: Wrench,
  box: Box,
  "shopping-bag": ShoppingBag,
  zap: Zap,
  truck: Truck,
  package: Package,
  grid: Grid3x3,
  settings: Settings,
  battery: Battery,
  sun: Sun,
}

export function getCategoryIcon(icon: string | null): LucideIcon {
  return ICON_MAP[icon || "grid"] || Grid3x3
}

type Props = {
  country: string
  category: Category | null
  sortOrderForNew: number
  onClose: () => void
  onSaved: () => void
}

export function CategoryFormModal({ country, category, sortOrderForNew, onClose, onSaved }: Props) {
  const [name, setName] = useState(category?.name || "")
  const [icon, setIcon] = useState(category?.icon || "grid")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingRename, setConfirmingRename] = useState(false)

  const isRename = !!category && name.trim().toLowerCase() !== category.name.trim().toLowerCase()

  async function handleSave() {
    if (!name.trim()) {
      setError("Category name is required.")
      return
    }
    if (isRename && !confirmingRename) {
      setConfirmingRename(true)
      return
    }

    setSaving(true)
    setError(null)

    const result = category
      ? await categoriesService.updateCategory(category, { name, icon })
      : await categoriesService.createCategory({ name, icon, sortOrder: sortOrderForNew, country })

    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">{category ? "Edit category" : "New category"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        {confirmingRename ? (
          <div>
            <p className="mb-5 text-sm text-[var(--muted)]">
              Every product currently saved as &ldquo;{category?.name}&rdquo; and every driver who selected it will
              be switched to &ldquo;{name.trim()}&rdquo;. This can&apos;t be undone.
            </p>
            {error && <p className="mb-3 text-xs font-semibold text-[#e0553f]">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-[var(--dark)] py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {saving ? "Renaming…" : "Rename"}
              </button>
              <button
                onClick={() => setConfirmingRename(false)}
                className="flex-1 rounded-xl bg-[#f5f5f5] py-2.5 text-xs font-bold text-[var(--ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Motor Oil"
                className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
              />
            </label>

            <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Icon</span>
            <div className="mb-5 flex flex-wrap gap-2">
              {ICON_CHOICES.map((choice) => {
                const Icon = getCategoryIcon(choice)
                const selected = icon === choice
                return (
                  <button
                    key={choice}
                    onClick={() => setIcon(choice)}
                    className={`flex size-10 items-center justify-center rounded-full ${
                      selected ? "bg-[var(--orange)] text-white" : "bg-[#f5f5f5] text-[var(--muted)]"
                    }`}
                    aria-label={choice}
                  >
                    <Icon className="size-4" />
                  </button>
                )
              })}
            </div>

            {error && <p className="mb-3 text-xs font-semibold text-[#e0553f]">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-[var(--dark)] py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : category ? "Save changes" : "Create category"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
