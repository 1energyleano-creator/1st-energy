// Admin-side convenience/service fee service for the operations website.
// Mirrors the mobile app's src/services/convenienceFeeService.js: the
// `convenience_fees` table, scoped per COUNTRY + CATEGORY, and optionally
// per specific town/city/village. This is what backs the "Service Fee"
// line at checkout — charged once per category order.
//
// Table shape: convenience_fees(id uuid primary key, country text,
// category text, location text null, fee numeric not null default 0,
// active boolean not null default true, updated_at timestamptz).
// Unique on (country, category, coalesce(location, '')).
//
// Resolution order for a given (country, category, location) — most
// specific wins, and an inactive row means "no fee at this scope" (does
// NOT fall back to a broader scope):
//   1. exact row for country + category + location -> active ? fee : 0
//   2. row for country + category with location = null (country-wide for
//      that category) -> active ? fee : 0
//   3. DEFAULT_CONVENIENCE_FEE (nothing configured yet)

import { supabase } from "./supabase"

export const DEFAULT_CONVENIENCE_FEE = 10

// Sentinel for "this fee applies to every town/city/village in the
// country for this category" — kept separate from an empty string typed
// into a text field.
export const ALL_LOCATIONS = null

export type ConvenienceFee = {
  id: string
  country: string
  category: string
  location: string | null
  fee: number
  active: boolean
}

// Every configured fee row for a country, for the admin list view — not
// filtered by category/location, so the admin sees everything at a glance.
async function getAllFees(country: string): Promise<{ data: ConvenienceFee[]; error: string | null }> {
  const { data, error } = await supabase
    .from("convenience_fees")
    .select("*")
    .eq("country", country)
    .order("category", { ascending: true })
    .order("location", { ascending: true, nullsFirst: true })

  if (error) {
    console.error("[convenience-fee-service] getAllFees failed:", error)
    return { data: [], error: "Could not load convenience fees. Try refreshing." }
  }
  return { data: (data || []) as ConvenienceFee[], error: null }
}

// Creates/updates the fee for one (country, category, location) scope.
// Pass location = null to set the country-wide default for that category.
async function setFee(
  country: string,
  category: string,
  fee: number,
  location: string | null = ALL_LOCATIONS,
  active = true,
): Promise<{ data: ConvenienceFee | null; error: string | null }> {
  const numericFee = Number(fee)
  if (Number.isNaN(numericFee) || numericFee < 0) {
    return { data: null, error: "Fee must be a non-negative number." }
  }
  if (!category) {
    return { data: null, error: "Please choose a category for this fee." }
  }

  const normalizedLocation = location ? String(location).trim() : null

  // Not using .upsert()/onConflict here: the table's real unique index is
  // on (country, category, COALESCE(location, '')) — a computed
  // expression, not a plain column list — which onConflict can never
  // match. Finding the existing row ourselves and updating/inserting
  // explicitly sidesteps that, same as the mobile app's service does.
  let findExisting = supabase.from("convenience_fees").select("id").eq("country", country).eq("category", category)
  findExisting = normalizedLocation ? findExisting.eq("location", normalizedLocation) : findExisting.is("location", null)

  const { data: existing, error: findError } = await findExisting.maybeSingle()
  if (findError) {
    console.error("[convenience-fee-service] setFee lookup failed:", findError)
    return { data: null, error: "Could not save this convenience fee." }
  }

  const payload = {
    country,
    category,
    location: normalizedLocation,
    fee: numericFee,
    active: !!active,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = existing
    ? await supabase.from("convenience_fees").update(payload).eq("id", existing.id).select().single()
    : await supabase.from("convenience_fees").insert(payload).select().single()

  if (error) {
    console.error("[convenience-fee-service] setFee failed:", error)
    return { data: null, error: "Could not save this convenience fee." }
  }
  return { data: data as ConvenienceFee, error: null }
}

async function setActive(id: string, active: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("convenience_fees")
    .update({ active: !!active, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("[convenience-fee-service] setActive failed:", error)
    return { error: "Could not update this fee." }
  }
  return { error: null }
}

async function deleteFee(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("convenience_fees").delete().eq("id", id)
  if (error) {
    console.error("[convenience-fee-service] deleteFee failed:", error)
    return { error: "Could not remove this fee." }
  }
  return { error: null }
}

export const convenienceFeeService = {
  getAllFees,
  setFee,
  setActive,
  deleteFee,
}
