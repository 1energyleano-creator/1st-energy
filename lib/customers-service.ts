// Admin-side customers service for the operations website. Mirrors the
// mobile app's src/Screens/AdminScreen/CustomersManagement.js, so the
// website lists the exact same `users` rows (role = 'customer') for the
// selected country, in the same newest-first order, with the same
// order-count lookup used for the details view.

import { supabase } from "./supabase"

export type Customer = {
  id: string
  name: string | null
  email: string | null
  phone_number: string | null
  city: string | null
  created_at: string
  role: string
  country: string
}

export type CustomerStats = {
  totalCustomers: number
  newThisMonth: number
}

async function getAllCustomers(country: string): Promise<{ data: Customer[]; error: string | null }> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, phone_number, city, created_at, role, country")
    .eq("role", "customer")
    .eq("country", country)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[customers-service] getAllCustomers failed:", error)
    return { data: [], error: "Could not load customers. Try refreshing." }
  }

  return { data: data || [], error: null }
}

async function getOrderCount(customerId: string): Promise<{ count: number | null; error: string | null }> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", customerId)

  if (error) {
    console.error("[customers-service] getOrderCount failed:", error)
    return { count: null, error: "Could not load order count." }
  }

  return { count: count ?? 0, error: null }
}

function getCustomerStats(customers: Customer[]): CustomerStats {
  const now = new Date()
  const newThisMonth = customers.filter((c) => {
    const created = new Date(c.created_at)
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()
  }).length

  return {
    totalCustomers: customers.length,
    newThisMonth,
  }
}

export const customersService = {
  getAllCustomers,
  getOrderCount,
  getCustomerStats,
}
