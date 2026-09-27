// Admin-side drivers service for the operations website. Mirrors the
// mobile app's src/Screens/AdminScreen/DriversManagement.js: same
// `driver_profiles` + `users` tables, same fields, same "truly active"
// definition (available AND a location ping within the last 5 minutes),
// and the same verify/approve/reject/activate/delete actions writing to
// the same columns the app reads.

import { supabase } from "./supabase"

const ACTIVE_LOCATION_WINDOW_MS = 5 * 60 * 1000 // must match the mobile app's driverService.getActiveDrivers()

export type VerificationStatus = "pending" | "approved" | "rejected"

export type DriverUser = {
  name: string | null
  email: string | null
  phone_number: string | null
  avatar_url: string | null
}

export type LatLng = { latitude: number; longitude: number }

export type Driver = {
  user_id: string
  country: string | null
  city: string | null
  license_number: string | null
  vehicle_type: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: string | null
  vehicle_color: string | null
  vehicle_registration: string | null
  experience_level: string | null
  categories: string[] | null
  is_available: boolean
  verification_status: VerificationStatus | null
  rejection_reason: string | null
  active: boolean | null
  total_trips: number | null
  total_earnings: number | null
  last_location: LatLng | null
  location_updated_at: string | null
  created_at: string
  license_front_image: string | null
  license_back_image: string | null
  vehicle_front_image: string | null
  vehicle_back_image: string | null
  vehicle_side_image: string | null
  ba_permit_image: string | null
  hazardous_permit_image: string | null
  users: DriverUser | null
}

export type DriverStats = {
  total: number
  active: number
  pendingReview: number
}

export function isDriverTrulyActive(driver: Driver): boolean {
  if (!driver.is_available) return false
  if (!driver.location_updated_at) return false
  return Date.now() - new Date(driver.location_updated_at).getTime() <= ACTIVE_LOCATION_WINDOW_MS
}

async function getAllDrivers(country: string): Promise<{ data: Driver[]; error: string | null }> {
  const { data: profiles, error } = await supabase
    .from("driver_profiles")
    .select("*")
    .eq("country", country)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[drivers-service] getAllDrivers failed:", error)
    return { data: [], error: "Could not load drivers. Try refreshing." }
  }

  const driverProfiles = (profiles || []) as Driver[]
  const userIds = [...new Set(driverProfiles.map((d) => d.user_id).filter(Boolean))]

  if (userIds.length > 0) {
    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("id, name, email, phone_number, avatar_url")
      .in("id", userIds)

    if (userError) {
      console.error("[drivers-service] user lookup failed:", userError)
      return { data: driverProfiles, error: "Loaded drivers, but some profile details could not be loaded." }
    }

    const userById = new Map((userRows || []).map((u) => [u.id, u]))
    for (const driver of driverProfiles) {
      driver.users = (userById.get(driver.user_id) as DriverUser) || null
    }
  }

  return { data: driverProfiles, error: null }
}

function getDriverStats(drivers: Driver[]): DriverStats {
  return {
    total: drivers.length,
    active: drivers.filter(isDriverTrulyActive).length,
    pendingReview: drivers.filter((d) => (d.verification_status || "pending") === "pending").length,
  }
}

async function approveDriver(driverId: string, adminId: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("driver_profiles")
    .update({
      verification_status: "approved",
      active: true,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", driverId)

  if (error) {
    console.error("[drivers-service] approveDriver failed:", error)
    return { error: "Failed to approve driver." }
  }
  return { error: null }
}

async function rejectDriver(
  driverId: string,
  reason: string,
  adminId: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("driver_profiles")
    .update({
      verification_status: "rejected",
      active: false,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", driverId)

  if (error) {
    console.error("[drivers-service] rejectDriver failed:", error)
    return { error: "Failed to reject driver." }
  }
  return { error: null }
}

async function setAvailability(
  driverId: string,
  available: boolean,
  currentVerificationStatus: VerificationStatus | null,
  adminId: string | null,
): Promise<{ error: string | null }> {
  const needsApprovalToo = available && (currentVerificationStatus || "pending") !== "approved"

  const updates: Record<string, unknown> = {
    is_available: available,
    updated_at: new Date().toISOString(),
  }
  if (needsApprovalToo) {
    updates.verification_status = "approved"
    updates.active = true
    updates.verified_at = new Date().toISOString()
    updates.verified_by = adminId
    updates.rejection_reason = null
  }

  const { error } = await supabase.from("driver_profiles").update(updates).eq("user_id", driverId)

  if (error) {
    console.error("[drivers-service] setAvailability failed:", error)
    return { error: "Failed to update driver status." }
  }
  return { error: null }
}

// Lets admin set/correct a driver's country directly from the website —
// mirrors the mobile app's DriversManagement.updateDriverCountry(), same
// `driver_profiles.country` column, so a row with a blank/wrong country
// (e.g. created before signup started writing it) can be fixed from
// either side and the fix is immediately visible on the other.
async function updateDriverCountry(driverId: string, countryCode: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("driver_profiles")
    .update({ country: countryCode, updated_at: new Date().toISOString() })
    .eq("user_id", driverId)

  if (error) {
    console.error("[drivers-service] updateDriverCountry failed:", error)
    return { error: "Failed to update country." }
  }
  return { error: null }
}

// Same reasoning as updateDriverCountry, but for city — mirrors the
// mobile app's updateDriverCity(). Callers should only offer city names
// drawn from the `locations` table for the driver's own country (see
// locations-service.ts), same guard the app applies.
async function updateDriverCity(driverId: string, cityName: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("driver_profiles")
    .update({ city: cityName, updated_at: new Date().toISOString() })
    .eq("user_id", driverId)

  if (error) {
    console.error("[drivers-service] updateDriverCity failed:", error)
    return { error: "Failed to update city." }
  }
  return { error: null }
}

// Lets admin correct/reassign a driver's delivery categories — mirrors
// the mobile app's toggleDriverCategory(), writing the full next array to
// the same `driver_profiles.categories` column the app reads to decide
// which orders a driver sees. An empty array means "sees every category",
// same meaning on both sides.
async function updateDriverCategories(driverId: string, categories: string[]): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("driver_profiles")
    .update({ categories, updated_at: new Date().toISOString() })
    .eq("user_id", driverId)

  if (error) {
    console.error("[drivers-service] updateDriverCategories failed:", error)
    return { error: "Failed to update categories." }
  }
  return { error: null }
}

async function deleteDriver(driverId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("driver_profiles").delete().eq("user_id", driverId)

  if (error) {
    console.error("[drivers-service] deleteDriver failed:", error)
    return { error: "Failed to delete driver." }
  }
  return { error: null }
}

export const driversService = {
  getAllDrivers,
  getDriverStats,
  approveDriver,
  rejectDriver,
  setAvailability,
  updateDriverCountry,
  updateDriverCity,
  updateDriverCategories,
  deleteDriver,
}
