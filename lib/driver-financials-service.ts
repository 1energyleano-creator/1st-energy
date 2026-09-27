// Admin-side driver financials service for the operations website. Mirrors
// the mobile app's src/Screens/AdminScreen/DriverFinancials.js +
// DriverWalletHistory.js and the adminService.getDriverFinancials function
// they call: same driver_payments ledger, same 5% commission definition,
// same revenue_resets watermark, same per-driver credited/commission/
// balance breakdown, and the same raw ledger (with running balance) for a
// single driver.

import { supabase } from "./supabase"

export type FinancialsPeriod = "week" | "month" | "quarter" | "year" | "all"

export type DriverFinancialRow = {
  driverId: string
  name: string
  isActive: boolean
  credited: number
  commissionPaid: number
  balance: number
  percentRemaining: number
  totalEarnings: number
  totalOrders: number
  rating: number
}

export type DriverFinancials = {
  period: FinancialsPeriod
  companyRevenue: number // commission actually earned this period (5% deductions)
  totalCreditedToDrivers: number // cash paid into driver wallets this period (top-ups)
  totalDriverEarnings: number // lifetime driver earnings (all-time, from driver_profiles)
  driverCount: number
  activeDriverCount: number
  drivers: DriverFinancialRow[]
}

export type WalletLedgerEntry = {
  id: string
  amount: number
  payment_method: string
  status: string
  reference: string | null
  metadata: { balance_after?: number } | null
  created_at: string
}

function startDateFor(period: FinancialsPeriod): Date {
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
    case "all":
      return new Date(0)
  }
  return start
}

async function getDriverFinancials(
  period: FinancialsPeriod,
  country: string,
): Promise<{ data: DriverFinancials | null; error: string | null }> {
  try {
    const startDate = startDateFor(period)

    const { data: lastReset } = await supabase
      .from("revenue_resets")
      .select("reset_at")
      .order("reset_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const resetFloor = lastReset?.reset_at ? new Date(lastReset.reset_at as string) : new Date(0)
    const floor = startDate > resetFloor ? startDate : resetFloor

    // Driver profiles for this country first — driver_payments isn't itself
    // country-scoped, so it's narrowed afterwards by this driver id set.
    const { data: profiles, error: profilesError } = await supabase
      .from("driver_profiles")
      .select("user_id, credit_balance, total_earnings, total_orders, total_trips, rating, is_available")
      .eq("country", country)
    if (profilesError) throw profilesError

    const driverIds = [...new Set((profiles || []).map((p: any) => p.user_id).filter(Boolean))]

    const { data: payments, error: paymentsError } = await supabase
      .from("driver_payments")
      .select("driver_id, amount, payment_method, status, created_at")
      .eq("status", "completed")
      .gte("created_at", floor.toISOString())
      .in("driver_id", driverIds.length ? driverIds : ["__none__"])
    if (paymentsError) throw paymentsError

    let userById = new Map<string, { name: string | null }>()
    if (driverIds.length > 0) {
      const { data: userRows, error: userError } = await supabase.from("users").select("id, name").in("id", driverIds)
      if (userError) {
        console.error("[driver-financials-service] user lookup failed:", userError)
      } else {
        userById = new Map((userRows || []).map((u: any) => [u.id, u]))
      }
    }

    const creditedByDriver = new Map<string, number>() // orange_money top-ups received
    const commissionByDriver = new Map<string, number>() // commission_deduction taken
    let companyRevenue = 0
    let totalCreditedToDrivers = 0

    for (const p of (payments as any[]) || []) {
      const amt = Number(p.amount) || 0
      if (p.payment_method === "orange_money" && amt > 0) {
        creditedByDriver.set(p.driver_id, (creditedByDriver.get(p.driver_id) || 0) + amt)
        totalCreditedToDrivers += amt
      } else if (p.payment_method === "commission_deduction") {
        const abs = Math.abs(amt)
        commissionByDriver.set(p.driver_id, (commissionByDriver.get(p.driver_id) || 0) + abs)
        companyRevenue += abs
      }
    }

    const totalDriverEarnings = (profiles || []).reduce((sum: number, p: any) => sum + (Number(p.total_earnings) || 0), 0)

    const drivers: DriverFinancialRow[] = (profiles || [])
      .map((p: any) => {
        const credited = creditedByDriver.get(p.user_id) || 0
        const commissionPaid = commissionByDriver.get(p.user_id) || 0
        const balance = Number(p.credit_balance) || 0
        // How much of what was credited this period is left before the
        // driver is locked out (5% commission taken per accepted order).
        const percentRemaining = credited > 0 ? Math.max(0, Math.min(100, Math.round((balance / credited) * 100))) : balance > 0 ? 100 : 0

        return {
          driverId: p.user_id,
          name: userById.get(p.user_id)?.name || "Unknown Driver",
          isActive: !!p.is_available,
          credited,
          commissionPaid,
          balance,
          percentRemaining,
          totalEarnings: Number(p.total_earnings) || 0,
          totalOrders: p.total_orders || p.total_trips || 0,
          rating: p.rating || 0,
        }
      })
      .sort((a: DriverFinancialRow, b: DriverFinancialRow) => b.credited - a.credited)

    return {
      data: {
        period,
        companyRevenue,
        totalCreditedToDrivers,
        totalDriverEarnings,
        driverCount: drivers.length,
        activeDriverCount: drivers.filter((d) => d.isActive).length,
        drivers,
      },
      error: null,
    }
  } catch (error) {
    console.error("[driver-financials-service] getDriverFinancials failed:", error)
    return { data: null, error: "Could not load driver financials. Try refreshing." }
  }
}

// Raw driver_payments ledger for one driver, newest first, same table
// DriverWalletHistory.js reads — every wallet top-up credit and every 5%
// commission deduction, with the running balance from metadata.balance_after.
async function getDriverWalletLedger(driverId: string): Promise<{ data: WalletLedgerEntry[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("driver_payments")
      .select("id, amount, payment_method, status, reference, metadata, created_at")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
    if (error) throw error

    return { data: (data || []) as WalletLedgerEntry[], error: null }
  } catch (error) {
    console.error("[driver-financials-service] getDriverWalletLedger failed:", error)
    return { data: [], error: "Could not load wallet history. Try refreshing." }
  }
}

export const driverFinancialsService = {
  getDriverFinancials,
  getDriverWalletLedger,
}
