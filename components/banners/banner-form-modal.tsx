"use client"

import { useState } from "react"
import { Image as ImageIcon, X } from "lucide-react"
import { bannersService, type Banner, type BannerPlacement } from "@/lib/banners-service"

type Props = {
  placement: BannerPlacement
  country: string
  banner: Banner | null
  onClose: () => void
  onSaved: () => void
}

export function BannerFormModal({ placement, country, banner, onClose, onSaved }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(banner?.image || null)
  const [title, setTitle] = useState(banner?.title || "")
  const [titletwo, setTitletwo] = useState(banner?.titletwo || "")
  const [description, setDescription] = useState(banner?.description || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSecondary = placement === "secondary"
  const isPronto = placement === "pronto"

  function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error } = await bannersService.saveBanner({
      placement,
      country,
      imageFile,
      existingImageUrl: banner?.image || null,
      title,
      titletwo,
      description,
      editingBanner: banner,
    })
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
          <h2 className="text-lg font-bold text-[var(--ink)]">
            {banner ? "Edit banner" : isSecondary ? "New Secondary Banner" : isPronto ? "New Pronto Banner" : "New Banner"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-4 block cursor-pointer">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Image (16:9) *</span>
          {imagePreview ? (
            <img src={imagePreview} alt="Banner preview" className="h-40 w-full rounded-xl object-cover" />
          ) : (
            <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[#F5F5F5]">
              <ImageIcon className="size-8 text-[var(--muted)]" />
              <span className="text-xs text-[var(--muted)]">Click to pick a banner image</span>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">
            {isPronto ? "Title (internal, optional)" : "Title *"}
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fuel Delivered Fast"
            className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
          />
        </label>

        {/* Secondary banner is title-only, and Pronto banner is image-only,
            on the customer side, so the subtitle field is hidden here
            rather than collected and unused. */}
        {!isSecondary && !isPronto && (
          <label className="mb-4 block">
            <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Subtitle</span>
            <input
              value={titletwo}
              onChange={(e) => setTitletwo(e.target.value)}
              placeholder="e.g. Order in minutes"
              className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
            />
          </label>
        )}

        <label className="mb-5 block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Shown on the 'Learn More' page"
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
          {saving ? "Saving…" : "Save banner"}
        </button>
      </div>
    </div>
  )
}
