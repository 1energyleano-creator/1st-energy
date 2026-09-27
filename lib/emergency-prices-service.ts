// Admin-side emergency prices service for the operations website.
// Mirrors the mobile app's src/Screens/AdminScreen/AdminEmergencyPrices.js:
// the `emergency_prices` table, scoped per country. This is the on/off
// switch for which fuel categories show up on the customer's Emergency
// Delivery screen at all — the actual per-litre price customers pay still
// comes from the `fuel_products` table (see fuel-products-service.ts).

import { supabase } from "./supabase"

// Emergency fuel delivery is petrol/diesel only — fixed list, same as the app.
export const EMERGENCY_PRICE_CATEGORIES = ["Petrol", "Diesel"] as const
export type EmergencyPriceCategory = (typeof EMERGENCY_PRICE_CATEGORIES)[number]

export type EmergencyPrice = {
  id: string
  category: string
  available: boolean
  country: string
}

async function getAllEmergencyPrices(country: string): Promise<{ data: EmergencyPrice[]; error: string | null }> {
  const { data, error } = await supabase
    .from("emergency_prices")
    .select("*")
    .eq("country", country)
    .order("category", { ascending: true })

  if (error) {
    console.error("[emergency-prices-service] getAllEmergencyPrices failed:", error)
    return { data: [], error: "Could not load emergency prices. Try refreshing." }
  }
  return { data: (data || []) as EmergencyPrice[], error: null }
}

async function saveEmergencyPrice(
  input: { category: string; available: boolean },
  country: string,
  editingPrice: EmergencyPrice | null,
): Promise<{ error: string | null }> {
  const category = input.category.trim()
  if (!category) return { error: 'Please choose a category, e.g. "Petrol" or "Diesel".' }

  const payload = {
    category,
    available: input.available,
    // New rows belong to whichever country is selected — editing an
    // existing row keeps its original country.
    country: editingPrice ? editingPrice.country : country,
  }

  if (editingPrice) {
    const { error } = await supabase.from("emergency_prices").update(payload).eq("id", editingPrice.id)
    if (error) {
      console.error("[emergency-prices-service] update failed:", error)
      return { error: "Could not save this emergency price entry." }
    }
  } else {
    const { error } = await supabase.from("emergency_prices").insert(payload)
    if (error) {
      console.error("[emergency-prices-service] insert failed:", error)
      return { error: "Could not save this emergency price entry." }
    }
  }

  return { error: null }
}

async function toggleAvailable(price: EmergencyPrice): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("emergency_prices")
    .update({ available: !price.available })
    .eq("id", price.id)
  if (error) {
    console.error("[emergency-prices-service] toggleAvailable failed:", error)
    return { error: "Could not update this entry." }
  }
  return { error: null }
}

async function deleteEmergencyPrice(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("emergency_prices").delete().eq("id", id)
  if (error) {
    console.error("[emergency-prices-service] deleteEmergencyPrice failed:", error)
    return { error: "Could not delete this entry." }
  }
  return { error: null }
}

export const emergencyPricesService = {
  getAllEmergencyPrices,
  saveEmergencyPrice,
  toggleAvailable,
  deleteEmergencyPrice,
}
