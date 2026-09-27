"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff, Grid3x3, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES } from "@/lib/countries"
import { categoriesService, type Category } from "@/lib/categories-service"
import { CategoryFormModal, getCategoryIcon } from "@/components/categories/category-form-modal"

export default function CategoriesPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await categoriesService.getAllCategories(country)
    setCategories(data)
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  async function handleToggleActive(category: Category) {
    const { error } = await categoriesService.updateCategory(category, { active: !category.active })
    if (error) return setError(error)
    load()
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Delete "${category.name}"? This can't be undone.`)) return
    const { error } = await categoriesService.deleteCategory(category.id, category.name, country)
    if (error) return setError(error)
    load()
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= categories.length) return

    const reordered = [...categories]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    setCategories(reordered)

    const { error } = await categoriesService.reorderCategories(reordered)
    if (error) setError(error)
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Catalog</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Categories</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Manage the categories customers browse and drivers opt into, per country. Reorder with the arrows.
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
              Add category
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
            Loading categories…
          </p>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
            <Grid3x3 className="mx-auto mb-3 size-10 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">No categories yet for this country</p>
            <button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="mt-4 rounded-xl bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white"
            >
              Add a category
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {categories.map((category, index) => {
              const Icon = getCategoryIcon(category.icon)
              return (
                <li key={category.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3">
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveCategory(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="text-[var(--muted)] disabled:opacity-30"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      onClick={() => moveCategory(index, 1)}
                      disabled={index === categories.length - 1}
                      aria-label="Move down"
                      className="text-[var(--muted)] disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>

                  <div className="flex size-10 items-center justify-center rounded-full bg-[#fff1ea]">
                    <Icon className="size-4 text-[var(--orange)]" />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-bold">{category.name}</p>
                    {!category.active && <p className="text-[11px] text-[var(--muted)]">Hidden</p>}
                  </div>

                  <button onClick={() => handleToggleActive(category)} aria-label="Toggle visibility" className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)]">
                    {category.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(category)
                      setFormOpen(true)
                    }}
                    aria-label="Edit category"
                    className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => handleDelete(category)} aria-label="Delete category" className="p-1.5 text-[#e0553f]">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {formOpen && (
        <CategoryFormModal
          country={country}
          category={editing}
          sortOrderForNew={categories.length}
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
