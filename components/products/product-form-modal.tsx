"use client"

import { useEffect, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import {
  productsService,
  getProductImageUrl,
  isGasCategory,
  type Product,
  type Category,
} from "@/lib/products-service"
import { getCurrencySymbolForCountry } from "@/lib/countries"

type Props = {
  country: string
  product: Product | null
  categoryOptions: Category[]
  cylinderSizes: string[]
  gasBrands: string[]
  onClose: () => void
  onSaved: () => void
}

const UNITS = ["litre", "kg", "unit"]

export function ProductFormModal({ country, product, categoryOptions, cylinderSizes, gasBrands, onClose, onSaved }: Props) {
  const isEditing = Boolean(product)
  const [title, setTitle] = useState(product?.title || "")
  const [brand, setBrand] = useState(product?.brand || "")
  const [cylinder, setCylinder] = useState(product?.cylinder || "")
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "")
  const [description, setDescription] = useState(product?.description || "")
  const [category, setCategory] = useState(product?.category || "")
  const [unit, setUnit] = useState(product?.unit || "litre")
  const [quantity, setQuantity] = useState(product?.quantity != null ? String(product.quantity) : "")
  const [available, setAvailable] = useState(product?.available !== false)
  const [imagePath, setImagePath] = useState(product?.image || "")
  const [imagePreview, setImagePreview] = useState<string | null>(getProductImageUrl(product?.image || null))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const gas = isGasCategory(category)
  const symbol = getCurrencySymbolForCountry(country)

  useEffect(() => {
    if (!categoryOptions.some((c) => c.name === category) && categoryOptions.length > 0 && !category) {
      setCategory(categoryOptions[0].name)
    }
  }, [categoryOptions, category])

  async function handleFileChange(file: File | null) {
    if (!file) return
    setUploading(true)
    setError("")
    const preview = URL.createObjectURL(file)
    setImagePreview(preview)
    const result = await productsService.uploadImage(file)
    setUploading(false)
    if (!result.success) {
      setError(result.error || "Could not upload image")
      return
    }
    setImagePath(result.path || "")
  }

  async function submit() {
    if (!title.trim()) {
      setError("Product title is required.")
      return
    }
    if (!category) {
      setError("Please choose a category.")
      return
    }
    const priceNumber = Number(price)
    if (!price || Number.isNaN(priceNumber) || priceNumber < 0) {
      setError("Enter a valid price.")
      return
    }
    setError("")
    setSaving(true)

    const payload = {
      title: title.trim(),
      brand: brand.trim() || null,
      cylinder: gas ? cylinder || null : null,
      price: priceNumber,
      description: description.trim() || null,
      category,
      unit,
      quantity: quantity ? Number(quantity) : 0,
      available,
      image: imagePath || null,
      country,
    }

    const result = isEditing
      ? await productsService.updateProduct(product!.id, payload)
      : await productsService.createProduct(payload)

    setSaving(false)
    if (result.error) {
      setError((result.error as any)?.message || "Could not save product.")
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEditing ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            {imagePreview ? (
              <img src={imagePreview} alt="" className="size-32 rounded-xl object-cover" />
            ) : (
              <div className="flex size-32 items-center justify-center rounded-xl bg-[#f5f5f5]">
                <ImagePlus className="size-6 text-[var(--muted)]" />
              </div>
            )}
            <label className="cursor-pointer rounded-xl bg-[#f5f5f5] px-4 py-2 text-xs font-bold text-[var(--orange)]">
              {uploading ? "Uploading…" : "Choose image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]" placeholder="e.g. Petrol 93" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]">
                <option value="" disabled>Select category</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {gas && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Brand</label>
                <select value={brand} onChange={(e) => setBrand(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]">
                  <option value="">Select brand</option>
                  {gasBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Cylinder size</label>
                <select value={cylinder} onChange={(e) => setCylinder(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]">
                  <option value="">Select size</option>
                  {cylinderSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Price *</label>
              <div className="flex h-11 items-center rounded-xl border border-[var(--line)] px-3">
                <span className="mr-1 text-sm font-bold text-[var(--muted)]">{symbol}</span>
                <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="w-full text-sm outline-none" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Quantity in stock</label>
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]" placeholder="0" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--orange)]" />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#f5f7fb] px-4 py-3">
            <span className="text-sm font-semibold">Available to order</span>
            <button
              onClick={() => setAvailable(!available)}
              className={`h-7 w-12 rounded-full p-1 transition ${available ? "bg-[var(--orange)]" : "bg-[#ddd]"}`}
              aria-pressed={available}
            >
              <span className={`block size-5 rounded-full bg-white transition ${available ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {error && <p className="rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="h-11 flex-1 rounded-xl bg-[#f5f5f5] text-sm font-bold text-[var(--muted)]">Cancel</button>
            <button onClick={submit} disabled={saving || uploading} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--orange)] text-sm font-bold text-white disabled:opacity-60">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Save changes" : "Add product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
