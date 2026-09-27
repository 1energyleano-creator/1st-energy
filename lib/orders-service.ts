// Admin-side orders service for the operations website. Mirrors the mobile
// app's src/Screens/AdminScreen/OrdersManagement.js and the order-related
// bits of src/services/adminService.js: same `orders` / `order_products` /
// `order_status_updates` / `order_history_clears` tables, same status
// lifecycle, same "assign driver" write (driver_id + status='accepted' +
// accepted_at), and the same history-clear watermark behaviour.
//
// Two things the app doesn't have that this adds, both additive and scoped
// to the website only: `createOrder`, so an admin can place an order on a
// customer's behalf (phone orders, walk-ins), and `getAvailableDrivers`,
// so the admin can pick a driver to assign from a dropdown instead of
// waiting for a driver to self-accept.

import { supabase } from "./supabase"

export type OrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled"

export type OrderUser = {
  id: string
  name: string | null
  email: string | null
  phone_number: string | null
}

export type Order = {
  id: string
  user_id: string | null
  driver_id: string | null
  status: OrderStatus | null
  address: string | null
  lat: number | null
  lng: number | null
  order_amount: number | null
  total_amount: number | null
  payment_method: string | null
  full_name: string | null
  phone_number: string | null
  category: string | null
  driver_name: string | null
  driver_surname: string | null
  car: string | null
  model: string | null
  plate: string | null
  country: string | null
  created_at: string
  updated_at: string | null
  accepted_at: string | null
  picked_up_at: string | null
  on_the_way_at: string | null
  arrived_at: string | null
  delivered_at: string | null
  user: OrderUser | null
}

export type OrderItem = {
  id: string
  order_id: string
  product_id?: string | null
  quantity: number | null
  title?: string | null
  product?: { title?: string; name?: string; price?: number | string } | null
}

export type OrderStatusUpdate = {
  id: string
  order_id: string
  status: string | null
  notes: string | null
  odometer_reading: string | null
  fuel_level: string | null
  issues: string | null
  attachments: { type?: string; url?: string; name?: string }[] | null
  created_at: string
}

export type AvailableDriver = {
  user_id: string
  is_available: boolean
  verification_status: string | null
  categories: string[] | null
  users: { name: string | null; phone_number: string | null } | null
}

export type OrderStats = {
  total: number
  pending: number
  active: number
  delivered: number
  cancelled: number
}

export const STATUS_OPTIONS: { id: OrderStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "picked_up", label: "Picked Up" },
  { id: "on_the_way", label: "On the Way" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
]

async function getLastOrderHistoryClear(): Promise<string | null> {
  const { data, error } = await supabase
    .from("order_history_clears")
    .select("cleared_at")
    .order("cleared_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return (data?.cleared_at as string) || null
}

async function clearOrderHistory(adminId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("order_history_clears").insert({ cleared_by: adminId, note: "" })
  if (error) {
    console.error("[orders-service] clearOrderHistory failed:", error)
    return { success: false, error: "Could not clear history. Try again." }
  }
  return { success: true }
}

async function getAllOrders(country: string, driverId?: string): Promise<{ data: Order[]; error: string | null }> {
  let query = supabase
    .from("orders")
    .select(`*, user:user_id ( id, name, email, phone_number )`)
    .order("created_at", { ascending: false })

  if (country) query = query.eq("country", country)
  if (driverId) query = query.eq("driver_id", driverId)

  const { data, error } = await query
  if (error) {
    console.error("[orders-service] getAllOrders failed:", error)
    return { data: [], error: "Could not load orders. Try refreshing." }
  }

  const clearedAtIso = await getLastOrderHistoryClear()
  let rows = (data || []) as Order[]

  if (clearedAtIso) {
    const cleared = new Date(clearedAtIso).getTime()
    rows = rows.filter((order) => {
      const finished = order.status === "delivered" || order.status === "cancelled"
      if (!finished) return true
      return new Date(order.created_at).getTime() > cleared
    })
  }

  return { data: rows, error: null }
}

function getOrderStats(orders: Order[]): OrderStats {
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    active: orders.filter((o) => o.status === "accepted" || o.status === "picked_up" || o.status === "on_the_way").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  }
}

async function getOrderItems(orderId: string): Promise<{ data: OrderItem[]; error: string | null }> {
  const { data, error } = await supabase.from("order_products").select("*").eq("order_id", orderId)
  if (error) {
    console.error("[orders-service] getOrderItems failed:", error)
    return { data: [], error: "Could not load order items." }
  }
  return { data: (data || []) as OrderItem[], error: null }
}

// Resolves whichever shape a given order_products row was written in —
// some checkout flows set a flat `title` + `product` jsonb blob, others
// embed a real product relation. Same merge logic as the app's
// getTopProducts / driverService.getProductsForOrders.
export function resolveItemName(item: OrderItem): string {
  const nested = item.product || {}
  return item.title || nested.title || nested.name || "Product"
}

export function resolveItemPrice(item: OrderItem): number {
  const nested = item.product || {}
  return Number(nested.price || 0)
}

async function getStatusUpdates(orderId: string): Promise<{ data: OrderStatusUpdate[]; error: string | null }> {
  const { data, error } = await supabase
    .from("order_status_updates")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[orders-service] getStatusUpdates failed:", error)
    return { data: [], error: "Could not load delivery updates." }
  }
  return { data: (data || []) as OrderStatusUpdate[], error: null }
}

async function getAvailableDrivers(country: string): Promise<{ data: AvailableDriver[]; error: string | null }> {
  let query = supabase
    .from("driver_profiles")
    .select("user_id, is_available, verification_status, categories, users:user_id ( name, phone_number )")
    .eq("verification_status", "approved")

  if (country) query = query.eq("country", country)

  const { data, error } = await query
  if (error) {
    console.error("[orders-service] getAvailableDrivers failed:", error)
    return { data: [], error: "Could not load drivers." }
  }
  return { data: (data || []) as unknown as AvailableDriver[], error: null }
}

async function assignDriver(orderId: string, driverId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("orders")
    .update({
      driver_id: driverId,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)

  if (error) {
    console.error("[orders-service] assignDriver failed:", error)
    return { success: false, error: "Could not assign driver. Try again." }
  }
  return { success: true }
}

const STATUS_TIMESTAMP_COLUMN: Partial<Record<OrderStatus, string>> = {
  accepted: "accepted_at",
  picked_up: "picked_up_at",
  on_the_way: "on_the_way_at",
  delivered: "delivered_at",
}

async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ success: boolean; error?: string }> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  const tsColumn = STATUS_TIMESTAMP_COLUMN[status]
  if (tsColumn) updates[tsColumn] = new Date().toISOString()

  const { error } = await supabase.from("orders").update(updates).eq("id", orderId)
  if (error) {
    console.error("[orders-service] updateOrderStatus failed:", error)
    return { success: false, error: "Could not update status. Try again." }
  }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Admin-created orders (phone orders / walk-ins) — not present in the app,
// which only ever has customers create their own orders at checkout. Writes
// the same `orders` + `order_products` shape the app's checkout flows
// produce, so it shows up identically everywhere else (driver app, orders
// list, order_products-reading reports).
// ---------------------------------------------------------------------------

export type NewOrderLine = { productId: string; title: string; price: number; quantity: number }

export type NewOrderInput = {
  country: string
  userId: string | null
  fullName: string
  phoneNumber: string
  address: string
  paymentMethod: string
  category: string | null
  lines: NewOrderLine[]
}

async function createOrder(input: NewOrderInput): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const orderAmount = input.lines.reduce((sum, line) => sum + line.price * line.quantity, 0)

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      full_name: input.fullName,
      phone_number: input.phoneNumber,
      address: input.address,
      payment_method: input.paymentMethod,
      category: input.category,
      order_amount: orderAmount,
      total_amount: orderAmount,
      status: "pending",
      country: input.country,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !order) {
    console.error("[orders-service] createOrder failed:", error)
    return { success: false, error: "Could not create the order. Try again." }
  }

  if (input.lines.length > 0) {
    const rows = input.lines.map((line) => ({
      order_id: order.id,
      product_id: line.productId,
      title: line.title,
      quantity: line.quantity,
      product: { title: line.title, price: line.price },
    }))
    const { error: itemsError } = await supabase.from("order_products").insert(rows)
    if (itemsError) {
      console.error("[orders-service] createOrder order_products insert failed:", itemsError)
      return { success: false, error: "Order was created but items could not be saved." }
    }
  }

  // Same in-app notification the app writes when a new order needs a
  // driver — lets the AdminNotifications-style feed and any subscribed
  // admin device pick this order up immediately. Skipped for walk-in
  // orders with no linked customer account.
  if (input.userId) {
    await supabase.from("notifications").insert({
      user_id: input.userId,
      title: "Order Received",
      message: "Your order has been received and is being processed.",
      type: "new_order",
      data: { type: "new_order", orderId: order.id },
      read: false,
      background_color: "#FF4F00",
      letter: "O",
      created_at: new Date().toISOString(),
    })
  }

  return { success: true, orderId: order.id as string }
}

export const ordersService = {
  getAllOrders,
  getOrderStats,
  getOrderItems,
  getStatusUpdates,
  getAvailableDrivers,
  assignDriver,
  updateOrderStatus,
  createOrder,
  getLastOrderHistoryClear,
  clearOrderHistory,
}
