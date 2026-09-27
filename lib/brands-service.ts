// Admin-side gas brands service for the operations website. Mirrors the
// mobile app's src/Screens/AdminScreen/AdminBrands.js: the same `brands`
// table, scoped per country, that customers see on the "Select Gas Brand"
// step when buying gas. Turning a brand off here hides it from that list
// immediately; it's fine for every brand to be off, since brand selection
// is optional on the customer side.

import { supabase } from "./supabase"

export type Brand = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  country: string
}

async function getAllBrands(country: string): Promise<{ data: Brand[]; error: string | null }> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("country", country)
    .order("name", { ascending: true })

  if (error) {
    console.error("[brands-service] getAllBrands failed:", error)
    return { data: [], error: "Could not load brands. Try refreshing." }
  }
  return { data: (data || []) as Brand[], error: null }
}

async function saveBrand(
  input: { name: string; description: string },
  country: string,
  existingBrands: Brand[],
  editingBrand: Brand | null,
): Promise<{ error: string | null }> {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return { error: 'Please enter a brand name, e.g. "Tswana Gas".' }
  }

  // Duplicate check scoped to this country — the same brand name can exist
  // in a different country, but not twice in this one.
  const isDuplicate = existingBrands.some(
    (b) => b.name.trim().toLowerCase() === trimmedName.toLowerCase() && (!editingBrand || b.id !== editingBrand.id),
  )
  if (isDuplicate) {
    return { error: `"${trimmedName}" is already in this country's brand list.` }
  }

  const payload = {
    name: trimmedName,
    description: input.description.trim() || null,
  }

  if (editingBrand) {
    const { error } = await supabase.from("brands").update(payload).eq("id", editingBrand.id)
    if (error) {
      console.error("[brands-service] update failed:", error)
      return { error: "Could not save brand." }
    }
  } else {
    const { error } = await supabase.from("brands").insert({ ...payload, is_active: true, country })
    if (error) {
      console.error("[brands-service] insert failed:", error)
      return { error: "Could not save brand." }
    }
  }

  return { error: null }
}

async function toggleActive(brand: Brand): Promise<{ error: string | null }> {
  const { error } = await supabase.from("brands").update({ is_active: !brand.is_active }).eq("id", brand.id)
  if (error) {
    console.error("[brands-service] toggleActive failed:", error)
    return { error: "Could not update brand." }
  }
  return { error: null }
}

async function deleteBrand(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("brands").delete().eq("id", id)
  if (error) {
    console.error("[brands-service] deleteBrand failed:", error)
    return { error: "Could not delete brand." }
  }
  return { error: null }
}

export const brandsService = {
  getAllBrands,
  saveBrand,
  toggleActive,
  deleteBrand,
}
