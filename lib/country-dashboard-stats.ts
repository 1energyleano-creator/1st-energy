// Mirrors the mobile app's src/services/adminService.js -> getDashboardStats,
// but instead of being scoped to a single country via a `country` argument,
// this pulls every row once and buckets the figures per country so the
// admin website can show "today revenue / total orders / pending / active
// drivers" for every country side by side, each in its own currency.
//
// Revenue definition matches the app exactly: money the platform actually
// collects is verified driver wallet top-ups (amount_verified on approved
// wallet_topup_requests), not order_amount (which is what customers pay for
// fuel/products and passes through to drivers/fuel stations).

import { supabase } from "./supabase"
import { COUNTRIES } from "./countries"

export type CountryStats = {
  code: string
  todayRevenue: number
  totalOrders: number
  pendingOrders: number
  activeDrivers: number
  totalDrivers: number
}

const emptyStats = (code: string): CountryStats => ({
  code,
  todayRevenue: 0,
  totalOrders: 0,
  pendingOrders: 0,
  activeDrivers: 0,
  totalDrivers: 0,
})

export async function getCountryDashboardStats(): Promise<{
  data: CountryStats[]
  error: unknown
}> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [topUpsRes, resetRes, ordersRes, driversRes] = await Promise.all([
    supabase
      .from("wallet_topup_requests")
      .select("amount_verified, amount_claimed, reviewed_at, created_at, country")
      .eq("status", "approved"),
    supabase.from("revenue_resets").select("reset_at").order("reset_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("orders").select("status, created_at, country"),
    supabase.from("driver_profiles").select("is_available, country"),
  ])

  const error = topUpsRes.error || ordersRes.error || driversRes.error
  const resetFloor = resetRes.data?.reset_at ? new Date(resetRes.data.reset_at) : new Date(0)
  const todayFloor = startOfToday > resetFloor ? startOfToday : resetFloor

  const byCountry = new Map<string, CountryStats>(COUNTRIES.map((c) => [c.code, emptyStats(c.code)]))
  const bucket = (code?: string | null) => {
    const key = code && byCountry.has(code) ? code : null
    if (!key) return null
    return byCountry.get(key)!
  }

  for (const row of topUpsRes.data || []) {
    const stat = bucket(row.country as string | null)
    if (!stat) continue
    const when = new Date((row.reviewed_at as string) || (row.created_at as string))
    if (when >= todayFloor) {
      stat.todayRevenue += Number((row.amount_verified as number) ?? (row.amount_claimed as number) ?? 0)
    }
  }

  for (const row of ordersRes.data || []) {
    const stat = bucket(row.country as string | null)
    if (!stat) continue
    stat.totalOrders += 1
    if (row.status === "pending") stat.pendingOrders += 1
  }

  for (const row of driversRes.data || []) {
    const stat = bucket(row.country as string | null)
    if (!stat) continue
    stat.totalDrivers += 1
    if (row.is_available) stat.activeDrivers += 1
  }

  return { data: Array.from(byCountry.values()), error }
}
