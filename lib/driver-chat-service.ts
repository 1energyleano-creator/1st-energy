// Admin-side driver chat service for the operations website. Mirrors the
// mobile app's src/services/driverSupportService.js admin functions,
// adapted to the browser: same `driver_support_messages` table, same RLS
// (an admin must be signed in). This is a general-purpose thread per
// driver — separate from wallet_topup_messages (the wallet top-up chat),
// which has its own service/page. Push notifications are handled by the
// mobile backend via Expo, so this also sends them directly (same public
// exp.host endpoint the app itself calls) so a driver whose app is closed
// still gets pinged when an admin replies from the website.

import { supabase } from "./supabase"

export type DriverChatMessage = {
  id: string
  driver_id: string
  sender_role: "driver" | "admin"
  message: string
  read_by_admin: boolean
  read_by_driver: boolean
  created_at: string
}

export type DriverChatThread = {
  driverId: string
  driverName: string
  driverPhone: string
  avatarUrl: string | null
  country: string | null
  city: string | null
  lastMessage: string
  lastSenderRole: "driver" | "admin"
  lastMessageAt: string
  unreadCount: number
}

type ServiceResult<T> = { data: T; error: string | null }

async function getAllThreads(): Promise<ServiceResult<DriverChatThread[]>> {
  try {
    const { data: rows, error } = await supabase
      .from("driver_support_messages")
      .select("driver_id, message, sender_role, created_at, read_by_admin")
      .order("created_at", { ascending: false })

    if (error) throw error

    const byDriver = new Map<string, DriverChatThread>()
    for (const row of rows || []) {
      if (!byDriver.has(row.driver_id)) {
        byDriver.set(row.driver_id, {
          driverId: row.driver_id,
          driverName: "Unknown Driver",
          driverPhone: "",
          avatarUrl: null,
          country: null,
          city: null,
          lastMessage: row.message,
          lastSenderRole: row.sender_role,
          lastMessageAt: row.created_at,
          unreadCount: 0,
        })
      }
      if (row.sender_role === "driver" && !row.read_by_admin) {
        byDriver.get(row.driver_id)!.unreadCount += 1
      }
    }

    const driverIds = Array.from(byDriver.keys())
    if (driverIds.length > 0) {
      const { data: driverRows, error: driverError } = await supabase
        .from("users")
        .select("id, name, phone_number, avatar_url, country, city")
        .in("id", driverIds)

      if (driverError) {
        console.error("[driver-chat-service] getting driver profiles failed:", driverError)
      } else {
        for (const driver of driverRows || []) {
          const thread = byDriver.get(driver.id)
          if (thread) {
            thread.driverName = driver.name || "Unknown Driver"
            thread.driverPhone = driver.phone_number || ""
            thread.avatarUrl = driver.avatar_url || null
            thread.country = driver.country || null
            thread.city = driver.city || null
          }
        }
      }
    }

    return { data: Array.from(byDriver.values()), error: null }
  } catch (error) {
    console.error("[driver-chat-service] getAllThreads failed:", error)
    return { data: [], error: "Could not load driver threads." }
  }
}

async function getTotalUnreadCount(): Promise<ServiceResult<number>> {
  try {
    const { count, error } = await supabase
      .from("driver_support_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_role", "driver")
      .eq("read_by_admin", false)

    if (error) throw error
    return { data: count || 0, error: null }
  } catch (error) {
    console.error("[driver-chat-service] getTotalUnreadCount failed:", error)
    return { data: 0, error: "Could not load unread count." }
  }
}

async function getMessages(driverId: string): Promise<ServiceResult<DriverChatMessage[]>> {
  try {
    const { data, error } = await supabase
      .from("driver_support_messages")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return { data: (data || []) as DriverChatMessage[], error: null }
  } catch (error) {
    console.error("[driver-chat-service] getMessages failed:", error)
    return { data: [], error: "Could not load messages." }
  }
}

async function markReadByAdmin(driverId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("driver_support_messages")
    .update({ read_by_admin: true })
    .eq("driver_id", driverId)
    .eq("sender_role", "driver")
    .eq("read_by_admin", false)
  if (error) {
    console.error("[driver-chat-service] markReadByAdmin failed:", error)
    return { error: "Could not mark thread read." }
  }
  return { error: null }
}

async function sendMessage(driverId: string, message: string): Promise<ServiceResult<DriverChatMessage | null>> {
  const trimmed = message.trim()
  if (!trimmed) return { data: null, error: "Message cannot be empty." }

  try {
    const { data, error } = await supabase
      .from("driver_support_messages")
      .insert({
        driver_id: driverId,
        sender_role: "admin",
        message: trimmed,
        read_by_admin: true,
        read_by_driver: false,
      })
      .select()
      .single()

    if (error) throw error

    // Same in-app notification row the mobile app writes for an admin
    // reply, so the driver has something to catch up on even if the push
    // below never lands (app closed, dead token, offline, etc).
    const preview = trimmed.slice(0, 50) + (trimmed.length > 50 ? "..." : "")
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: driverId,
      title: "New message from Admin",
      message: preview,
      letter: "M",
      read: false,
      background_color: "#2196F3",
      type: "driver_support_reply",
      data: { type: "driver_support", screen: "DriverAdminChat" },
      created_at: new Date().toISOString(),
    })
    if (notifError) {
      console.error("[driver-chat-service] saving notification failed:", notifError)
    }

    await sendPushToUser(driverId, {
      title: "New message from Admin",
      body: preview,
      data: { type: "driver_support", screen: "DriverAdminChat" },
      channelId: "chat",
    })

    return { data: data as DriverChatMessage, error: null }
  } catch (error) {
    console.error("[driver-chat-service] sendMessage failed:", error)
    return { data: null, error: "Could not send message." }
  }
}

function subscribeToMessages(driverId: string, onMessage: (message: DriverChatMessage) => void) {
  return supabase
    .channel(`driver_support_admin_${driverId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "driver_support_messages", filter: `driver_id=eq.${driverId}` },
      (payload) => onMessage(payload.new as DriverChatMessage),
    )
    .subscribe()
}

function subscribeToAllThreads(callback: () => void) {
  return supabase
    .channel("driver-support-inbox")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "driver_support_messages" }, () => callback())
    .subscribe()
}

// Sends to every device this user is logged in on, via the same public
// Expo push endpoint the mobile app itself posts to — no server function
// needed. Best-effort: a missing/dead token just means no push, the
// notifications row above still lets the driver catch up in-app.
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
    console.error("[driver-chat-service] sendPushToUser failed:", error)
  }
}

export const driverChatService = {
  getAllThreads,
  getTotalUnreadCount,
  getMessages,
  markReadByAdmin,
  sendMessage,
  subscribeToMessages,
  subscribeToAllThreads,
}
