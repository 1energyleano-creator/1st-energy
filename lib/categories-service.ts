// Admin-side categories service for the operations website. Mirrors the
// mobile app's src/services/categoryService.js: same `categories` table,
// same per-country scoping, and the same cascades — renaming re-points
// every product and every driver's `categories` array from the old name
// to the new one (loose/fuzzy matched, same as the app), auto-enrolling
// new categories into every driver who has an opted-in category list, and
// refusing to delete a category still used by a product.

import { supabase } from "./supabase"

export type Category = {
  id: string
  name: string
  icon: string | null
  active: boolean
  sort_order: number
  country: string
}

// Same curated Feather icon set the app's picker offers, mapped to their
// lucide-react equivalents so the web icon picker shows the same choices.
export const ICON_CHOICES = [
  "droplet",
  "wind",
  "wrench",
  "box",
  "shopping-bag",
  "zap",
  "truck",
  "package",
  "grid",
  "settings",
  "battery",
  "sun",
] as const

function looselyMatchesCategory(raw: string | null | undefined, categoryName: string): boolean {
  const value = String(raw || "").trim().toLowerCase()
  const name = String(categoryName || "").trim().toLowerCase()
  if (!value || !name) return false
  if (value === name || value.includes(name) || name.includes(value)) return true
  if (name === "gas" && (value.includes("gas") || value.includes("lpg"))) return true
  return false
}

async function getAllCategories(country: string): Promise<{ data: Category[]; error: string | null }> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("country", country)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[categories-service] getAllCategories failed:", error)
    return { data: [], error: "Could not load categories. Try refreshing." }
  }
  return { data: (data || []) as Category[], error: null }
}

async function createCategory(input: {
  name: string
  icon: string
  sortOrder: number
  country: string
}): Promise<{ data: Category | null; error: string | null }> {
  const trimmed = input.name.trim()
  if (!trimmed) return { data: null, error: "Category name is required." }

  const { data, error } = await supabase
    .from("categories")
    .insert([{ name: trimmed, icon: input.icon || "grid", sort_order: input.sortOrder ?? 0, country: input.country }])
    .select()
    .single()

  if (error) {
    console.error("[categories-service] createCategory failed:", error)
    return { data: null, error: "Failed to create category." }
  }

  // Auto-enroll: a brand-new category starts with zero drivers opted in,
  // so give every driver in this country who has a non-empty categories
  // list (i.e. who isn't already opted into "everything") this one too.
  const { data: driverRows, error: driversFetchError } = await supabase
    .from("driver_profiles")
    .select("user_id, categories")
    .eq("country", input.country)

  if (driversFetchError) {
    console.error("[categories-service] auto-enroll lookup failed:", driversFetchError)
  } else {
    for (const row of driverRows || []) {
      const categories: string[] = row.categories || []
      if (categories.length === 0) continue
      if (categories.includes(trimmed)) continue
      const { error: driverUpdateError } = await supabase
        .from("driver_profiles")
        .update({ categories: [...categories, trimmed] })
        .eq("user_id", row.user_id)
      if (driverUpdateError) {
        console.error(`[categories-service] enrolling driver ${row.user_id} failed:`, driverUpdateError)
      }
    }
  }

  return { data: data as Category, error: null }
}

async function _cascadeRename(oldName: string, newName: string, country: string) {
  const { data: products, error: productsFetchError } = await supabase
    .from("products")
    .select("id, category")
    .eq("country", country)

  if (productsFetchError) {
    console.error("[categories-service] rename: product lookup failed:", productsFetchError)
  } else {
    const matchedIds = (products || [])
      .filter((p) => looselyMatchesCategory(p.category, oldName))
      .map((p) => p.id)

    if (matchedIds.length > 0) {
      const { error: productsUpdateError } = await supabase
        .from("products")
        .update({ category: newName })
        .in("id", matchedIds)
      if (productsUpdateError) {
        console.error("[categories-service] rename: product update failed:", productsUpdateError)
      }
    }
  }

  const { data: driverRows, error: driversFetchError } = await supabase
    .from("driver_profiles")
    .select("user_id, categories")
    .eq("country", country)

  if (driversFetchError) {
    console.error("[categories-service] rename: driver lookup failed:", driversFetchError)
    return
  }

  for (const row of driverRows || []) {
    const categories: string[] = row.categories || []
    const hasMatch = categories.some((c) => looselyMatchesCategory(c, oldName))
    if (!hasMatch) continue

    const nextCategories = categories.map((c) => (looselyMatchesCategory(c, oldName) ? newName : c))
    const { error: driverUpdateError } = await supabase
      .from("driver_profiles")
      .update({ categories: nextCategories })
      .eq("user_id", row.user_id)
    if (driverUpdateError) {
      console.error(`[categories-service] rename: driver ${row.user_id} update failed:`, driverUpdateError)
    }
  }
}

async function updateCategory(
  category: Category,
  updates: { name?: string; icon?: string; sortOrder?: number; active?: boolean },
): Promise<{ data: Category | null; error: string | null }> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.icon !== undefined) payload.icon = updates.icon
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder
  if (updates.active !== undefined) payload.active = updates.active

  const { data, error } = await supabase.from("categories").update(payload).eq("id", category.id).select().single()

  if (error) {
    console.error("[categories-service] updateCategory failed:", error)
    return { data: null, error: "Failed to update category." }
  }

  const newName = typeof payload.name === "string" ? payload.name : undefined
  const isRename = newName && newName.trim().toLowerCase() !== category.name.trim().toLowerCase()
  if (isRename) {
    await _cascadeRename(category.name, newName!, category.country)
  }

  return { data: data as Category, error: null }
}

async function reorderCategories(ordered: Category[]): Promise<{ error: string | null }> {
  const results = await Promise.all(
    ordered.map((cat, index) => supabase.from("categories").update({ sort_order: index }).eq("id", cat.id)),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) {
    console.error("[categories-service] reorderCategories failed:", failed.error)
    return { error: "Failed to save the new order." }
  }
  return { error: null }
}

async function deleteCategory(id: string, name: string, country: string): Promise<{ error: string | null }> {
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .ilike("category", name)
    .eq("country", country)

  if (countError) {
    console.error("[categories-service] deleteCategory count check failed:", countError)
    return { error: "Could not check if this category is in use." }
  }

  if (count && count > 0) {
    return {
      error: `${count} product${count === 1 ? "" : "s"} still use this category. Reassign or delete them first.`,
    }
  }

  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) {
    console.error("[categories-service] deleteCategory failed:", error)
    return { error: "Failed to delete category." }
  }
  return { error: null }
}

export const categoriesService = {
  getAllCategories,
  createCategory,
  updateCategory,
  reorderCategories,
  deleteCategory,
}
