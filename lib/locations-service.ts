// Admin-side locations service for the operations website. Mirrors the
// mobile app's src/services/adminLocationCatalogService.js: the
// admin-controlled `locations` table (towns/cities/villages), scoped per
// country — same shape/pattern as categories-service.ts. Drivers pick one
// of these (active only) at signup; customers pick one for delivery
// location; this page manages the full list including inactive entries,
// and backs the Convenience Fee page's per-location picker.

import { supabase } from "./supabase"

export type LocationType = "city" | "town" | "village"

export const LOCATION_TYPE_CHOICES: { id: LocationType; label: string }[] = [
  { id: "city", label: "City" },
  { id: "town", label: "Town" },
  { id: "village", label: "Village" },
]

export type LocationRow = {
  id: string
  name: string
  type: LocationType
  active: boolean
  sort_order: number
  country: string
}

async function getAllLocations(country: string): Promise<{ data: LocationRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("country", country)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[locations-service] getAllLocations failed:", error)
    return { data: [], error: "Could not load locations. Try refreshing." }
  }
  return { data: (data || []) as LocationRow[], error: null }
}

async function createLocation(input: {
  name: string
  type: LocationType
  sortOrder: number
  country: string
}): Promise<{ data: LocationRow | null; error: string | null }> {
  const trimmed = input.name.trim()
  if (!trimmed) return { data: null, error: "Location name is required." }

  const { data, error } = await supabase
    .from("locations")
    .insert([{ name: trimmed, type: input.type || "city", sort_order: input.sortOrder ?? 0, country: input.country }])
    .select()
    .single()

  if (error) {
    console.error("[locations-service] createLocation failed:", error)
    // Unique index on (country, lower(name)) — surface a friendly message
    // instead of the raw Postgres duplicate-key error.
    if ((error as { code?: string }).code === "23505") {
      return { data: null, error: `"${trimmed}" already exists for this country.` }
    }
    return { data: null, error: "Failed to create location." }
  }
  return { data: data as LocationRow, error: null }
}

async function updateLocation(
  location: LocationRow | string,
  updates: { name?: string; type?: LocationType; sortOrder?: number; active?: boolean },
): Promise<{ data: LocationRow | null; error: string | null }> {
  const id = typeof location === "object" ? location.id : location

  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.type !== undefined) payload.type = updates.type
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder
  if (updates.active !== undefined) payload.active = updates.active

  const { data, error } = await supabase.from("locations").update(payload).eq("id", id).select().single()

  if (error) {
    console.error("[locations-service] updateLocation failed:", error)
    if ((error as { code?: string }).code === "23505") {
      return { data: null, error: "That name already exists for this country." }
    }
    return { data: null, error: "Failed to update location." }
  }
  return { data: data as LocationRow, error: null }
}

async function reorderLocations(ordered: LocationRow[]): Promise<{ error: string | null }> {
  const results = await Promise.all(
    ordered.map((loc, index) => supabase.from("locations").update({ sort_order: index }).eq("id", loc.id)),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) {
    console.error("[locations-service] reorderLocations failed:", failed.error)
    return { error: "Failed to save the new order." }
  }
  return { error: null }
}

// Refuses to delete a location that a driver already has selected, same
// guard categories-service.deleteCategory() applies for products — an
// admin has to reassign that driver's city first, or deactivate instead
// of deleting.
async function deleteLocation(id: string, name: string, country: string): Promise<{ error: string | null }> {
  const { count, error: countError } = await supabase
    .from("driver_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("city", name)
    .eq("country", country)

  if (countError) {
    console.error("[locations-service] deleteLocation count check failed:", countError)
    return { error: "Could not check if this location is in use." }
  }

  if (count && count > 0) {
    return {
      error: `${count} driver${count === 1 ? "" : "s"} still ${count === 1 ? "has" : "have"} this set as their city. Reassign them or deactivate it instead.`,
    }
  }

  const { error } = await supabase.from("locations").delete().eq("id", id)
  if (error) {
    console.error("[locations-service] deleteLocation failed:", error)
    return { error: "Failed to delete location." }
  }
  return { error: null }
}

export const locationsService = {
  getAllLocations,
  createLocation,
  updateLocation,
  reorderLocations,
  deleteLocation,
}
