"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ImageIcon, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES } from "@/lib/countries"
import { bannersService, PLACEMENTS, type Banner, type BannerPlacement } from "@/lib/banners-service"
import { BannerFormModal } from "@/components/banners/banner-form-modal"

export default function BannersPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [placement, setPlacement] = useState<BannerPlacement>("top")
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await bannersService.getAllBanners(placement, country)
    setBanners(data)
    setError(error)
    setLoading(false)
  }, [placement, country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  const activePlacement = PLACEMENTS.find((p) => p.key === placement)!

  async function handleToggleActive(banner: Banner) {
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, is_active: !b.is_active } : b)))
    const { error } = await bannersService.toggleActive(banner)
    if (error) {
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, is_active: banner.is_active } : b)))
      setError(error)
    }
  }

  async function handleDelete(banner: Banner) {
    if (!confirm(`Delete "${banner.title || "this banner"}"? This cannot be undone.`)) return
    const { error } = await bannersService.deleteBanner(banner)
    if (error) return setError(error)
    setBanners((prev) => prev.filter((b) => b.id !== banner.id))
  }

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
        <Link href="/operations/dashboard/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to products
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Content</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Banners</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Banners you add here show up right away in the customer app — no app update needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="flex items-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3 text-xs font-bold text-white"
            >
              <Plus className="size-4" />
              Add banner
            </button>
          </div>
        </div>

        <div className="mb-2 flex flex-wrap gap-2">
          {PLACEMENTS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlacement(p.key)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                placement === p.key ? "bg-[var(--orange)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mb-6 text-xs text-[var(--muted)]">{activePlacement.hint}</p>

        {error && <p className="mb-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
            Loading banners…
          </p>
        ) : banners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
            <ImageIcon className="mx-auto mb-3 size-10 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">No {activePlacement.label.toLowerCase()}s yet</p>
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="mt-4 rounded-xl bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white"
            >
              Add your first banner
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {banners.map((banner) => (
              <li key={banner.id} className="flex overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                <img src={banner.image} alt={banner.title || "Banner"} className="h-24 w-32 shrink-0 object-cover" />
                <div className="flex-1 p-4">
                  <p className="truncate text-sm font-bold">{banner.title || "Untitled"}</p>
                  {placement !== "secondary" && placement !== "pronto" && banner.titletwo && (
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{banner.titletwo}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--muted)]">
                      <button
                        role="switch"
                        aria-checked={banner.is_active}
                        onClick={() => handleToggleActive(banner)}
                        className={`relative h-5 w-9 rounded-full transition ${banner.is_active ? "bg-[var(--orange)]" : "bg-[#e2e8f0]"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-4 rounded-full bg-white transition ${banner.is_active ? "left-4" : "left-0.5"}`}
                        />
                      </button>
                      {banner.is_active ? "Visible to customers" : "Hidden from customers"}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditing(banner)
                          setFormOpen(true)
                        }}
                        aria-label="Edit banner"
                        className="text-[var(--muted)] hover:text-[var(--ink)]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => handleDelete(banner)} aria-label="Delete banner" className="text-[#e0553f]">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <BannerFormModal
          placement={placement}
          country={country}
          banner={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            load()
          }}
        />
      )}
    </main>
  )
}
