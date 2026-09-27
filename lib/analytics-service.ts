// Admin-side analytics service for the operations website. Mirrors the
// mobile app's src/Screens/AdminScreen/Analytics.js + the analytics slice of
// src/services/adminService.js: same period buckets (week/month/quarter/
// year), same revenue definition (commission_deduction rows in
// driver_payments, i.e. actual platform revenue — not order_amount, which
// is customer spend that passes through to drivers/fuel stations), same
// revenue-reset watermark, same order-status/top-products/peak-hours/
// completion-rate calculations, and the same top-drivers-by-earnings query.
//
// One thing carried over exactly as-is from the app: the commission_payments
// query below is NOT scoped by country (the app's getAnalytics doesn't
// filter driver_payments by country either), so "Total Revenue" reflects
// platform-wide commission regardless of the selected country filter.

import { supabase } from "./supabase"

export type AnalyticsPeriod = "week" | "month" | "quarter" | "year"

export type SeriesData = {
  labels: string[]
  data: number[]
}

export type DriverSplit = {
  name: string
  population: number
  color: string
}

export type StatusSlice = {
  name: string
  color: string
  count: number
  population: number
}

export type TopProduct = {
  name: string
  sales: number
}

export type PeakHour = {
  hour: string
  orders: number
}

export type AnalyticsData = {
  revenue: SeriesData
  orders: SeriesData
  drivers: DriverSplit[]
  customers: { total: number; newThisPeriod: number }
  statusDistribution: StatusSlice[]
  topProducts: TopProduct[]
  peakHours: PeakHour[]
  completionRate: number
  totalOrdersCount: number
}

export type TopDriver = {
  name: string
  rating: number
  trips: number
  earnings: number
}

export const emptyAnalytics: AnalyticsData = {
  revenue: { labels: [], data: [] },
  orders: { labels: [], data: [] },
  drivers: [
    { name: "Active", population: 0, color: "#4CAF50" },
    { name: "Inactive", population: 0, color: "#757575" },
  ],
  customers: { total: 0, newThisPeriod: 0 },
  statusDistribution: [],
  topProducts: [],
  peakHours: Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, orders: 0 })),
  completionRate: 0,
  totalOrdersCount: 0,
}

function startDateFor(period: AnalyticsPeriod): Date {
  const start = new Date()
  switch (period) {
    case "week":
      start.setDate(start.getDate() - 7)
      break
    case "month":
      start.setMonth(start.getMonth() - 1)
      break
    case "quarter":
      start.setMonth(start.getMonth() - 3)
      break
    case "year":
      start.setFullYear(start.getFullYear() - 1)
      break
  }
  return start
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function processRevenueData(commissionPayments: { amount: number; created_at: string }[]): SeriesData {
  if (!commissionPayments || commissionPayments.length === 0) return { labels: [], data: [] }
  const byDate: Record<string, number> = {}
  for (const payment of commissionPayments) {
    const date = shortDate(payment.created_at)
    byDate[date] = (byDate[date] || 0) + Math.abs(Number(payment.amount) || 0)
  }
  return { labels: Object.keys(byDate), data: Object.values(byDate) }
}

function processOrdersData(orders: { created_at: string }[]): SeriesData {
  if (!orders || orders.length === 0) return { labels: [], data: [] }
  const byDate: Record<string, number> = {}
  for (const order of orders) {
    const date = shortDate(order.created_at)
    byDate[date] = (byDate[date] || 0) + 1
  }
  return { labels: Object.keys(byDate), data: Object.values(byDate) }
}

function processDriversData(drivers: { is_available: boolean | null }[]): DriverSplit[] {
  if (!drivers || drivers.length === 0) {
    return [
      { name: "Active", population: 0, color: "#4CAF50" },
      { name: "Inactive", population: 0, color: "#757575" },
    ]
  }
  const active = drivers.filter((d) => d.is_available === true).length
  return [
    { name: "Active", population: active, color: "#4CAF50" },
    { name: "Inactive", population: drivers.length - active, color: "#757575" },
  ]
}

function processCustomersData(users: { created_at: string }[], period: AnalyticsPeriod) {
  if (!users || users.length === 0) return { total: 0, newThisPeriod: 0 }
  const start = startDateFor(period)
  const newUsers = users.filter((u) => new Date(u.created_at) >= start).length
  return { total: users.length, newThisPeriod: newUsers }
}

const STATUS_META: Record<string, { name: string; color: string }> = {
  pending: { name: "Pending", color: "#FF9800" },
  accepted: { name: "Accepted", color: "#4CAF50" },
  picked_up: { name: "Picked Up", color: "#2196F3" },
  on_the_way: { name: "On the Way", color: "#9C27B0" },
  arrived: { name: "Arrived", color: "#009688" },
  delivered: { name: "Delivered", color: "#3F51B5" },
  cancelled: { name: "Cancelled", color: "#F44336" },
}
const UNKNOWN_STATUS_META = { name: "Unknown", color: "#9E9E9E" }

function processStatusDistribution(orders: { status: string | null }[]): StatusSlice[] {
  if (!orders || orders.length === 0) return []
  const counts: Record<string, number> = {}
  for (const order of orders) {
    const raw = order.status || "pending"
    const key = Object.prototype.hasOwnProperty.call(STATUS_META, raw) ? raw : "__unknown__"
    counts[key] = (counts[key] || 0) + 1
  }
  const total = orders.length
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => {
      const meta = status === "__unknown__" ? UNKNOWN_STATUS_META : STATUS_META[status]
      return { name: meta.name, color: meta.color, count, population: Math.round((count / total) * 100) }
    })
    .sort((a, b) => b.count - a.count)
}

async function getTopProducts(orderIds: string[]): Promise<TopProduct[]> {
  if (!orderIds || orderIds.length === 0) return []

  const { data, error } = await supabase.from("order_products").select("*").in("order_id", orderIds)
  if (error || !data || data.length === 0) {
    if (error) console.error("[analytics-service] getTopProducts failed:", error)
    return []
  }

  const sales: Record<string, number> = {}
  for (const item of data as Record<string, any>[]) {
    const nested = item.product || {}
    const name: string = item.title ?? nested.title ?? nested.name ?? "Unknown Product"
    sales[name] = (sales[name] || 0) + (item.quantity || 1)
  }

  return Object.entries(sales)
    .map(([name, count]) => ({ name, sales: count }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)
}

function processPeakHours(orders: { created_at: string }[]): PeakHour[] {
  const counts = Array(24).fill(0)
  for (const order of orders || []) {
    counts[new Date(order.created_at).getHours()]++
  }
  return counts.map((count, hour) => ({ hour: `${hour}:00`, orders: count }))
}

function processCompletionRate(orders: { status: string | null }[]): number {
  if (!orders || orders.length === 0) return 0
  const delivered = orders.filter((o) => o.status === "delivered" || o.status === "completed").length
  return Math.round((delivered / orders.length) * 100)
}

async function getAnalytics(
  period: AnalyticsPeriod,
  country: string,
): Promise<{ data: AnalyticsData | null; error: string | null }> {
  try {
    const startDate = startDateFor(period)

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .eq("country", country)
      .order("created_at", { ascending: true })
    if (ordersError) throw ordersError

    const { data: drivers, error: driversError } = await supabase
      .from("driver_profiles")
      .select("is_available")
      .eq("country", country)
    if (driversError) throw driversError

    // "New Customers" counts real customer signups (role='customer'),
    // matching what NewCustomers.js / the customers page filters on.
    const { data: usersRows, error: usersError } = await supabase
      .from("users")
      .select("created_at")
      .eq("role", "customer")
      .eq("country", country)
      .gte("created_at", startDate.toISOString())
    if (usersError) throw usersError

    const { data: lastReset } = await supabase
      .from("revenue_resets")
      .select("reset_at")
      .order("reset_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const resetFloor = lastReset?.reset_at ? new Date(lastReset.reset_at as string) : new Date(0)
    const revenueFloor = startDate > resetFloor ? startDate : resetFloor

    const { data: commissionPayments, error: paymentsError } = await supabase
      .from("driver_payments")
      .select("amount, payment_method, status, created_at")
      .eq("status", "completed")
      .eq("payment_method", "commission_deduction")
      .gte("created_at", revenueFloor.toISOString())
      .order("created_at", { ascending: true })
    if (paymentsError) throw paymentsError

    const orderRows = orders || []

    const data: AnalyticsData = {
      revenue: processRevenueData((commissionPayments as any) || []),
      orders: processOrdersData(orderRows as any),
      drivers: processDriversData((drivers as any) || []),
      customers: processCustomersData((usersRows as any) || [], period),
      statusDistribution: processStatusDistribution(orderRows as any),
      topProducts: await getTopProducts(orderRows.map((o: any) => o.id)),
      peakHours: processPeakHours(orderRows as any),
      completionRate: processCompletionRate(orderRows as any),
      totalOrdersCount: orderRows.length,
    }

    return { data, error: null }
  } catch (error) {
    console.error("[analytics-service] getAnalytics failed:", error)
    return { data: null, error: "Could not load analytics data. Try refreshing." }
  }
}

async function getTopDrivers(limit: number, country: string): Promise<{ data: TopDriver[]; error: string | null }> {
  try {
    const { data: profiles, error } = await supabase
      .from("driver_profiles")
      .select("user_id, rating, total_earnings, total_orders, total_trips")
      .eq("country", country)
      .order("total_earnings", { ascending: false })
      .limit(limit)
    if (error) throw error

    const drivers = profiles || []
    const userIds = [...new Set(drivers.map((d: any) => d.user_id).filter(Boolean))]

    let byId = new Map<string, { name: string | null }>()
    if (userIds.length > 0) {
      const { data: userRows, error: userError } = await supabase.from("users").select("id, name").in("id", userIds)
      if (userError) {
        console.error("[analytics-service] getTopDrivers user lookup failed:", userError)
      } else {
        byId = new Map((userRows || []).map((u: any) => [u.id, u]))
      }
    }

    return {
      data: drivers.map((d: any) => ({
        name: byId.get(d.user_id)?.name || "Unknown Driver",
        rating: d.rating || 0,
        trips: d.total_orders || d.total_trips || 0,
        earnings: d.total_earnings || 0,
      })),
      error: null,
    }
  } catch (error) {
    console.error("[analytics-service] getTopDrivers failed:", error)
    return { data: [], error: "Could not load driver performance." }
  }
}

export const analyticsService = {
  getAnalytics,
  getTopDrivers,
}
