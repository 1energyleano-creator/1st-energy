// Admin-side emergency fuel depot service for the operations website.
// Mirrors the mobile app's src/Screens/AdminScreen/AdminEmergencyDepot.js and
// src/services/emergencyDeliveryFeeService.js: one `emergency_depots` row per
// country — the point emergency fuel delivery distance is measured from for
// the tiered call-out fee (first 10km flat, then a per-km rate after that).

import { supabase } from "./supabase"

// Kept in sync with the mobile app's emergencyDeliveryFeeService.js constants.
export const FLAT_FEE_KM_THRESHOLD = 10 // km
export const FLAT_FEE = 35 // pula, covers the first 10km
export const PER_KM_FEE_AFTER_THRESHOLD = 3.5 // pula per km, only on the km beyond 10

export type EmergencyDepot = {
  country: string
  latitude: number
  longitude: number
  updated_at: string
}

/**
 * Pure pricing calculation — no network call, so it can be reused anywhere
 * the distance is already known (e.g. re-quoting, admin previews) without
 * waiting on a depot fetch.
 */
export function calculateEmergencyFee(distanceKm: number | null): number {
  if (distanceKm == null || Number.isNaN(distanceKm) || distanceKm <= 0) {
    return FLAT_FEE
  }
  if (distanceKm <= FLAT_FEE_KM_THRESHOLD) {
    return FLAT_FEE
  }
  const extraKm = distanceKm - FLAT_FEE_KM_THRESHOLD
  return FLAT_FEE + extraKm * PER_KM_FEE_AFTER_THRESHOLD
}

async function getDepot(country: string): Promise<{ data: EmergencyDepot | null; error: string | null }> {
  const { data, error } = await supabase
    .from("emergency_depots")
    .select("*")
    .eq("country", country)
    .maybeSingle()

  if (error) {
    console.error("[emergency-depot-service] getDepot failed:", error)
    return { data: null, error: "Could not load the emergency depot. Try refreshing." }
  }
  return { data: data as EmergencyDepot | null, error: null }
}

async function setDepot(
  country: string,
  latitude: number,
  longitude: number,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("emergency_depots")
    .upsert(
      { country, latitude, longitude, updated_at: new Date().toISOString() },
      { onConflict: "country" },
    )

  if (error) {
    console.error("[emergency-depot-service] setDepot failed:", error)
    return { error: "Could not save the emergency depot location. Please try again." }
  }
  return { error: null }
}

export const emergencyDepotService = {
  getDepot,
  setDepot,
  calculateEmergencyFee,
}
