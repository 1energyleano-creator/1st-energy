// Admin-side live drivers map service for the operations website. Mirrors
// the mobile app's src/Screens/AdminScreen/AdminDriversMap.js: same
// `driver_profiles.last_location` (jsonb {latitude, longitude}) +
// `location_updated_at` fields, the same "on delivery" order statuses,
// and the same staleness/offline rules — so a pin means the same thing
// on the website as it does in the app.

import { supabase } from "./supabase"
import type { LatLng } from "./drivers-service"

// A driver counts as "on delivery" if they currently have an order in
// this status assigned to them — matches the status DriverService.
// acceptOrder() writes in the mobile app.
export const ON_DELIVERY_STATUSES = ["accepted", "picked_up", "on_the_way", "arrived"]

// If a driver's phone location gets turned off (or the app is killed)
// while they're still toggled "online" in-app, last_location simply
// stops updating — is_available alone can't catch that. Anything with a
// last update older than this is treated as offline for pin color,
// regardless of the is_available toggle.
export const STALE_LOCATION_MS = 10 * 60 * 1000 // 10 minutes

// There's no realtime subscription on driver_profiles.last_location, so
// polling on this interval is what keeps pins moving without a manual
// refresh — same cadence the mobile app's map uses.
export const REFRESH_INTERVAL_MS = 20000

export type LiveDriverUser = {
  name: string | null
  phone_number: string | null
}

export type LiveDriver = {
  user_id: string
  city: string | null
  vehicle_type: string | null
  vehicle_registration: string | null
  last_location: LatLng | null
  location_updated_at: string | null
  is_available: boolean
  active: boolean | null
  users: LiveDriverUser | null
}

export type CustomerPin = {
  orderId: string
  customerName: string
  address: string
  latitude: number
  longitude: number
  acceptedAt: string | null
}

export type DriverMapStatus = "available" | "on_delivery" | "offline"

export const STATUS_META: Record<DriverMapStatus, { color: string; label: string }> = {
  available: { color: "#10B981", label: "Available" },
  on_delivery: { color: "#EF4444", label: "On delivery" },
  offline: { color: "#94A3B8", label: "Offline" },
}

// Pin color for the customer end of an in-progress delivery — distinct
// from every driver status color so admin can tell a customer pin apart
// from a driver pin at a glance.
export const CUSTOMER_PIN_COLOR = "#3B82F6"

export function isLocationStale(driver: Pick<LiveDriver, "location_updated_at">): boolean {
  if (!driver.location_updated_at) return true
  return Date.now() - new Date(driver.location_updated_at).getTime() > STALE_LOCATION_MS
}

export function statusOf(driver: LiveDriver, onDeliveryDriverIds: Set<string>): DriverMapStatus {
  if (!driver.is_available || isLocationStale(driver)) return "offline"
  if (onDeliveryDriverIds.has(driver.user_id)) return "on_delivery"
  return "available"
}

export function timeAgo(isoString: string | null): string {
  if (!isoString) return "unknown"
  const diffMs = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// How long a driver has been on their current delivery so far — from
// accepted_at to now.
export function formatElapsed(acceptedAtIso: string | null): string | null {
  if (!acceptedAtIso) return null
  const diffMs = Date.now() - new Date(acceptedAtIso).getTime()
  if (diffMs < 0) return null
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just accepted"
  if (mins < 60) return `${mins} min so far`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins}m so far`
}

export type LiveDriversResult = {
  drivers: LiveDriver[]
  onDeliveryIds: Set<string>
  customerByDriverId: Map<string, CustomerPin>
  error: string | null
}

async function getLiveDrivers(country: string): Promise<LiveDriversResult> {
  // Same "split queries instead of embedded join" pattern as
  // drivers-service.ts — an embedded join breaks the whole query if the
  // FK name or RLS access to `users` is off.
  const { data: profiles, error } = await supabase
    .from("driver_profiles")
    .select(
      "user_id, city, vehicle_type, vehicle_registration, last_location, location_updated_at, is_available, active",
    )
    .eq("country", country)
    .eq("active", true)

  if (error) {
    console.error("[live-drivers-map-service] getLiveDrivers failed:", error)
    return { drivers: [], onDeliveryIds: new Set(), customerByDriverId: new Map(), error: "Could not load drivers. Try refreshing." }
  }

  const driverProfiles = (profiles || []) as LiveDriver[]
  const userIds = [...new Set(driverProfiles.map((d) => d.user_id).filter(Boolean))]

  let userById = new Map<string, LiveDriverUser>()
  if (userIds.length > 0) {
    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("id, name, phone_number")
      .in("id", userIds)
    if (userError) console.error("[live-drivers-map-service] user lookup failed:", userError)
    userById = new Map((userRows || []).map((u) => [u.id, u as LiveDriverUser]))
  }

  // Anyone currently assigned to an in-progress order counts as "on
  // delivery" regardless of is_available. Also pulls each order's
  // destination (lat/lng) and the customer's name so a driver's pin can
  // be traced to their customer's pin, same as the mobile app's map.
  let onDeliveryDriverIds = new Set<string>()
  let customerByDriverId = new Map<string, CustomerPin>()
  if (userIds.length > 0) {
    const { data: activeOrders, error: ordersError } = await supabase
      .from("orders")
      .select("id, driver_id, user_id, full_name, address, lat, lng, accepted_at")
      .in("driver_id", userIds)
      .in("status", ON_DELIVERY_STATUSES)
    if (ordersError) console.error("[live-drivers-map-service] active orders lookup failed:", ordersError)

    onDeliveryDriverIds = new Set((activeOrders || []).map((o) => o.driver_id))

    // A driver can only be actively delivering one order at a time, so
    // driver_id -> order is a safe 1:1 map here.
    customerByDriverId = new Map(
      (activeOrders || [])
        .filter((o) => o.lat && o.lng)
        .map((o) => [
          o.driver_id as string,
          {
            orderId: o.id,
            customerName: o.full_name || "Customer",
            address: o.address || "",
            latitude: Number(o.lat),
            longitude: Number(o.lng),
            acceptedAt: o.accepted_at || null,
          } as CustomerPin,
        ]),
    )
  }

  const merged = driverProfiles
    .map((d) => ({ ...d, users: userById.get(d.user_id) || null }))
    .filter((d) => d.last_location && d.last_location.latitude && d.last_location.longitude)

  return { drivers: merged, onDeliveryIds: onDeliveryDriverIds, customerByDriverId, error: null }
}

export const liveDriversMapService = {
  getLiveDrivers,
}
