// Admin-side delivery fee service for the operations website. Mirrors the
// mobile app's src/services/deliveryFeeService.js: one `delivery_rate_config`
// row per country for the distance-based Accessories/Appliances delivery
// fee. Fuel and gas categories are priced separately (see Emergency
// Depot/Prices) and never use this rate.

import { supabase } from "./supabase"

export const ACCESSORIES_APPLIANCES_CATEGORY = "Accessories and Appliances"

// Defaults match current real-world pricing (P35 flat for the first 10km,
// then P3.50/km after) so a country with no row yet still prices
// identically to one that does — same fallback the app uses.
export const DEFAULT_DELIVERY_RATE = { base_fee: 35, included_km: 10, per_km_fee: 3.5 }

export type DeliveryRate = {
  country: string
  base_fee: number
  included_km: number
  per_km_fee: number
}

async function getRate(country: string): Promise<{ data: DeliveryRate; error: string | null }> {
  const { data, error } = await supabase
    .from("delivery_rate_config")
    .select("*")
    .eq("country", country)
    .maybeSingle()

  if (error) {
    console.error("[delivery-fee-service] getRate failed:", error)
    return { data: { country, ...DEFAULT_DELIVERY_RATE }, error: "Could not load delivery pricing. Try refreshing." }
  }
  if (!data) {
    return { data: { country, ...DEFAULT_DELIVERY_RATE }, error: null }
  }
  return {
    data: {
      country,
      base_fee: Number(data.base_fee),
      included_km: Number(data.included_km),
      per_km_fee: Number(data.per_km_fee),
    },
    error: null,
  }
}

async function setRate(
  country: string,
  rate: { base_fee: number; included_km: number; per_km_fee: number },
): Promise<{ data: DeliveryRate | null; error: string | null }> {
  const { base_fee, included_km, per_km_fee } = rate
  if ([base_fee, included_km, per_km_fee].some((n) => Number.isNaN(n) || n < 0)) {
    return { data: null, error: "All rate values must be non-negative numbers." }
  }

  const { data, error } = await supabase
    .from("delivery_rate_config")
    .upsert(
      { country, base_fee, included_km, per_km_fee, updated_at: new Date().toISOString() },
      { onConflict: "country" },
    )
    .select()
    .single()

  if (error) {
    console.error("[delivery-fee-service] setRate failed:", error)
    return { data: null, error: "Could not save delivery pricing. Please try again." }
  }
  return { data: data as DeliveryRate, error: null }
}

// Pure math, no DB — kept in sync with deliveryFeeService.js's
// calculateFee() so the live preview here matches what a driver's
// acceptOrder() would actually charge. First `included_km` are covered by
// the flat `base_fee`; every additional km beyond that is charged at
// `per_km_fee`.
function calculateFee(distanceKm: number, rate: DeliveryRate): number {
  const { base_fee, included_km, per_km_fee } = rate
  if (distanceKm <= included_km) return Number(base_fee.toFixed(2))
  const extraKm = distanceKm - included_km
  return Number((base_fee + extraKm * per_km_fee).toFixed(2))
}

export const deliveryFeeService = {
  getRate,
  setRate,
  calculateFee,
}
