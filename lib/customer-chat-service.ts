// Admin-side customer chat service for the operations website. Mirrors the
// mobile app's src/services/customerSupportService.js admin functions,
// adapted to the browser: same `customer_support_messages` table, same
// RLS (an admin must be signed in). General-purpose thread per customer —
// separate from wallet_topup_messages (drivers' wallet top-up chat), which
// has its own service/page. Sends push the same way driver-chat-service.ts
// does, directly to Expo's public endpoint, so a customer whose app is
// closed still gets pinged when an admin replies from the website.

import { supabase } from "./supabase"

export type CustomerChatMessage = {
  id: string
  customer_id: string
  sender_role: "customer" | "admin"
  message: string
  read_by_admin: boolean
  read_by_customer: boolean
  created_at: string
}

export type CustomerChatThread = {
  customerId: string
  customerName: string
  customerPhone: string
  avatarUrl: string | null
  country: string | null
  city: string | null
  lastMessage: string
  lastSenderRole: "customer" | "admin"
  lastMessageAt: string
  unreadCount: number
}

type ServiceResult<T> = { data: T; error: string | null }

async function getAllThreads(): Promise<ServiceResult<CustomerChatThread[]>> {
  try {
    const { data: rows, error } = await supabase
      .from("customer_support_messages")
      .select("customer_id, message, sender_role, created_at, read_by_admin")
      .order("created_at", { ascending: false })

    if (error) throw error

    const byCustomer = new Map<string, CustomerChatThread>()
    for (const row of rows || []) {
      if (!byCustomer.has(row.customer_id)) {
        byCustomer.set(row.customer_id, {
          customerId: row.customer_id,
          customerName: "Unknown Customer",
          customerPhone: "",
          avatarUrl: null,
          country: null,
          city: null,
          lastMessage: row.message,
          lastSenderRole: row.sender_role,
          lastMessageAt: row.created_at,
          unreadCount: 0,
        })
      }
      if (row.sender_role === "customer" && !row.read_by_admin) {
        byCustomer.get(row.customer_id)!.unreadCount += 1
      }
    }

    const customerIds = Array.from(byCustomer.keys())
    if (customerIds.length > 0) {
      const { data: customerRows, error: customerError } = await supabase
        .from("users")
        .select("id, name, phone_number, avatar_url, country, city")
        .in("id", customerIds)

      if (customerError) {
        console.error("[customer-chat-service] getting customer profiles failed:", customerError)
      } else {
        for (const customer of customerRows || []) {
          const thread = byCustomer.get(customer.id)
          if (thread) {
            thread.customerName = customer.name || "Unknown Customer"
            thread.customerPhone = customer.phone_number || ""
            thread.avatarUrl = customer.avatar_url || null
            thread.country = customer.country || null
            thread.city = customer.city || null
          }
        }
      }
    }

    return { data: Array.from(byCustomer.values()), error: null }
  } catch (error) {
    console.error("[customer-chat-service] getAllThreads failed:", error)
    return { data: [], error: "Could not load customer threads." }
  }
}

async function getTotalUnreadCount(): Promise<ServiceResult<number>> {
  try {
    const { count, error } = await supabase
      .from("customer_support_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_role", "customer")
      .eq("read_by_admin", false)

    if (error) throw error
    return { data: count || 0, error: null }
  } catch (error) {
    console.error("[customer-chat-service] getTotalUnreadCount failed:", error)
    return { data: 0, error: "Could not load unread count." }
  }
}

async function getMessages(customerId: string): Promise<ServiceResult<CustomerChatMessage[]>> {
  try {
    const { data, error } = await supabase
      .from("customer_support_messages")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return { data: (data || []) as CustomerChatMessage[], error: null }
  } catch (error) {
    console.error("[customer-chat-service] getMessages failed:", error)
    return { data: [], error: "Could not load messages." }
  }
}

async function markReadByAdmin(customerId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("customer_support_messages")
    .update({ read_by_admin: true })
    .eq("customer_id", customerId)
    .eq("sender_role", "customer")
    .eq("read_by_admin", false)
  if (error) {
    console.error("[customer-chat-service] markReadByAdmin failed:", error)
    return { error: "Could not mark thread read." }
  }
  return { error: null }
}

async function sendMessage(customerId: string, message: string): Promise<ServiceResult<CustomerChatMessage | null>> {
  const trimmed = message.trim()
  if (!trimmed) return { data: null, error: "Message cannot be empty." }

  try {
    const { data, error } = await supabase
      .from("customer_support_messages")
      .insert({
        customer_id: customerId,
        sender_role: "admin",
        message: trimmed,
        read_by_admin: true,
        read_by_customer: false,
      })
      .select()
      .single()

    if (error) throw error

    // Same in-app notification row the mobile app writes for an admin
    // reply, so the customer has something to catch up on even if the
    // push below never lands (app closed, dead token, offline, etc).
    const preview = trimmed.slice(0, 50) + (trimmed.length > 50 ? "..." : "")
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: customerId,
      title: "New message from Admin",
      message: preview,
      letter: "M",
      read: false,
      background_color: "#2196F3",
      type: "customer_support_reply",
      data: { type: "customer_support", screen: "CustomerSupportChat" },
      created_at: new Date().toISOString(),
    })
    if (notifError) {
      console.error("[customer-chat-service] saving notification failed:", notifError)
    }

    await sendPushToUser(customerId, {
      title: "New message from Admin",
      body: preview,
      data: { type: "customer_support", screen: "CustomerSupportChat" },
      channelId: "chat",
    })

    return { data: data as CustomerChatMessage, error: null }
  } catch (error) {
    console.error("[customer-chat-service] sendMessage failed:", error)
    return { data: null, error: "Could not send message." }
  }
}

function subscribeToMessages(customerId: string, onMessage: (message: CustomerChatMessage) => void) {
  return supabase
    .channel(`customer_support_admin_${customerId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "customer_support_messages", filter: `customer_id=eq.${customerId}` },
      (payload) => onMessage(payload.new as CustomerChatMessage),
    )
    .subscribe()
}

function subscribeToAllThreads(callback: () => void) {
  return supabase
    .channel("customer-support-inbox")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_support_messages" }, () => callback())
    .subscribe()
}

// Sends to every device this user is logged in on, via the same public
// Expo push endpoint the mobile app itself posts to — no server function
// needed. Best-effort: a missing/dead token just means no push, the
// notifications row above still lets the customer catch up in-app.
async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string; data?: Record<string, unknown>; channelId?: string },
) {
  try {
    const { data: tokenRows, error } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", userId)
    if (error || !tokenRows || tokenRows.length === 0) return

    const tokens = [...new Set(tokenRows.map((r) => r.token).filter(Boolean))]
    if (tokens.length === 0) return

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: notification.channelId || "chat",
      priority: "high",
    }))

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    })
  } catch (error) {
    console.error("[customer-chat-service] sendPushToUser failed:", error)
  }
}

export const customerChatService = {
  getAllThreads,
  getTotalUnreadCount,
  getMessages,
  markReadByAdmin,
  sendMessage,
  subscribeToMessages,
  subscribeToAllThreads,
}
