// Admin-side notifications service for the operations website. Mirrors the
// mobile app's:
//   - src/Screens/AdminScreen/AdminNotifications.js (in-app feed)
//   - src/Screens/AdminScreen/AdminPushNotifications.js (push composer)
//   - src/services/notificationPreferences.js (per-type sound settings)
//
// Same Supabase tables and columns as the app. Two differences, both noted
// inline: there is no device to play an "in-app chime" through on the web,
// so sound prefs here just control what gets written to the `notifications`
// row (and are stored in localStorage, not AsyncStorage); and OS-level push
// delivery is handled by the same backend trigger on `notifications` insert
// that the mobile app relies on (see wallet-service.ts), so composing and
// sending here writes the same rows the app writes and the existing
// pipeline takes it from there — nothing extra to wire up on the web.

import { supabase } from "./supabase"
import { getCurrencySymbolForCountry } from "./countries"

// ---------------------------------------------------------------------------
// In-app notification feed
// ---------------------------------------------------------------------------

export type FeedItem = {
  id: string
  title: string
  subtitle: string
  time: string
  href: string
}

export type FeedSection = {
  key: string
  title: string
  data: FeedItem[]
  error: string | null
}

async function getFeed(isMainAdmin: boolean): Promise<FeedSection[]> {
  const queries: any[] = [
    supabase
      .from("orders")
      .select("id, full_name, address, created_at")
      .is("driver_id", null)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
  ]

  if (isMainAdmin) {
    queries.push(
      supabase
        .from("wallet_topup_requests")
        .select("id, driver_id, amount_claimed, country, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
    )
    queries.push(
      supabase
        .from("driver_support_messages")
        .select("id, driver_id, message, created_at, read_by_admin")
        .eq("read_by_admin", false)
        .order("created_at", { ascending: false })
        .limit(20),
    )
    queries.push(
      supabase
        .from("customer_support_messages")
        .select("id, customer_id, message, created_at, read_by_admin")
        .eq("sender_role", "customer")
        .eq("read_by_admin", false)
        .order("created_at", { ascending: false })
        .limit(20),
    )
  }

  const results = await Promise.all(queries)
  const [ordersRes, topupsRes, supportRes, customerSupportRes] = results

  const sections: FeedSection[] = []

  sections.push({
    key: "orders",
    title: "Unassigned Orders",
    data: (ordersRes.data || []).map((o: any) => ({
      id: `order-${o.id}`,
      title: o.full_name || "New order",
      subtitle: o.address || "",
      time: o.created_at,
      href: "#",
    })),
    error: ordersRes.error ? "Could not load unassigned orders." : null,
  })

  if (isMainAdmin) {
    sections.push({
      key: "topups",
      title: "Pending Wallet Top-Ups",
      data: (topupsRes?.data || []).map((t: any) => ({
        id: `topup-${t.id}`,
        title: `${getCurrencySymbolForCountry(t.country)}${Number(t.amount_claimed || 0).toFixed(2)} top-up request`,
        subtitle: "Tap to review",
        time: t.created_at,
        href: "/operations/dashboard/wallet",
      })),
      error: topupsRes?.error ? "Could not load wallet top-ups." : null,
    })

    sections.push({
      key: "driver-support",
      title: "Unread Driver Support Messages",
      data: (supportRes?.data || []).map((m: any) => ({
        id: `support-${m.id}`,
        title: (m.message || "New message").slice(0, 60),
        subtitle: "Tap to reply",
        time: m.created_at,
        href: "/operations/dashboard/driver-chat",
      })),
      error: supportRes?.error ? "Could not load driver support messages." : null,
    })

    sections.push({
      key: "customer-support",
      title: "Unread Customer Messages",
      data: (customerSupportRes?.data || []).map((m: any) => ({
        id: `customer-support-${m.id}`,
        title: (m.message || "New message").slice(0, 60),
        subtitle: "Tap to reply",
        time: m.created_at,
        href: "/operations/dashboard/customer-chat",
      })),
      error: customerSupportRes?.error ? "Could not load customer messages." : null,
    })
  }

  return sections.filter((s) => s.data.length > 0 || s.error)
}

// ---------------------------------------------------------------------------
// Push notification composer
// ---------------------------------------------------------------------------

export type Audience = "customers" | "drivers"
export type SendMode = "all" | "selected" | "category"

export type Recipient = {
  id: string
  name: string | null
  phone_number: string | null
}

export type SendResult = { success: boolean; sentCount?: number; message?: string }

async function loadRecipients(audience: Audience, country: string): Promise<{ data: Recipient[]; error: string | null }> {
  let query = supabase
    .from("users")
    .select("id, name, phone_number")
    .eq("role", audience === "drivers" ? "driver" : "customer")
    .order("name", { ascending: true })

  if (country) query = query.eq("country", country)

  const { data, error } = await query
  if (error) {
    console.error("[notifications-service] loadRecipients failed:", error)
    return { data: [], error: `Could not load the ${audience === "drivers" ? "driver" : "customer"} list.` }
  }
  return { data: data || [], error: null }
}

// Every composed notification is written as a `notifications` row per
// recipient — the same table + columns the app reads for its in-app feed,
// and whose insert already triggers the OS push on the backend (see the
// note at the top of this file).
async function insertForUsers(
  userIds: string[],
  title: string,
  body: string,
  type: string,
): Promise<SendResult> {
  if (userIds.length === 0) {
    return { success: false, message: "No recipients matched." }
  }
  const rows = userIds.map((user_id) => ({
    user_id,
    title,
    message: body,
    type,
    data: { type },
    read: false,
    background_color: "#FF4F00",
    letter: title.charAt(0).toUpperCase() || "N",
    created_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from("notifications").insert(rows)
  if (error) {
    console.error("[notifications-service] insertForUsers failed:", error)
    return { success: false, message: "Failed to send notification." }
  }
  return { success: true, sentCount: rows.length }
}

async function sendToAll(audience: Audience, title: string, body: string, country: string): Promise<SendResult> {
  let query = supabase.from("users").select("id").eq("role", audience === "drivers" ? "driver" : "customer")
  if (country) query = query.eq("country", country)
  const { data, error } = await query
  if (error) {
    console.error("[notifications-service] sendToAll failed:", error)
    return { success: false, message: "Could not load recipients." }
  }
  return insertForUsers((data || []).map((u) => u.id), title, body, audience === "drivers" ? "admin_broadcast_driver" : "admin_broadcast_customer")
}

async function sendToSelected(audience: Audience, userIds: string[], title: string, body: string): Promise<SendResult> {
  return insertForUsers(userIds, title, body, audience === "drivers" ? "admin_message" : "admin_broadcast_customer")
}

async function sendToDriversByCategory(category: string, title: string, body: string, country: string): Promise<SendResult> {
  let query = supabase.from("driver_profiles").select("user_id, categories")
  if (country) query = query.eq("country", country)
  const { data, error } = await query
  if (error) {
    console.error("[notifications-service] sendToDriversByCategory failed:", error)
    return { success: false, message: "Could not load drivers for that category." }
  }
  const target = String(category).trim().toLowerCase()
  const userIds = (data || [])
    .filter((d: any) => Array.isArray(d.categories) && d.categories.some((c: string) => String(c).trim().toLowerCase() === target))
    .map((d: any) => d.user_id)
  return insertForUsers(userIds, title, body, "admin_broadcast_driver")
}

// ---------------------------------------------------------------------------
// Per-notification-type sound settings
// ---------------------------------------------------------------------------
// Admin-only, per-TYPE preferences — same three types + defaults as the
// mobile app's DEFAULT_NOTIFICATION_PREFERENCES. Stored per-browser via
// localStorage (the web equivalent of the app's AsyncStorage), since a
// browser tab has no persistent per-admin device profile on the server.
export type SoundMode = "in_app" | "system" | "off"
export type NotificationTypePref = { mode: SoundMode; soundId: string; label: string }

const STORAGE_KEY = "admin_notification_preferences_v1"
const DEFAULT_USER_SOUND_SETTINGS_KEY = "default_user_notification_sound"

export const SOUND_LIBRARY = [
  { id: "sound1", label: "Sound 1 — Cash Register" },
  { id: "sound2", label: "Sound 2 — Ding" },
  { id: "sound3", label: "Sound 3 — Pop" },
  { id: "sound4", label: "Sound 4" },
  { id: "sound5", label: "Sound 5" },
  { id: "sound6", label: "Sound 6" },
]

export const DEFAULT_NOTIFICATION_PREFERENCES: Record<string, NotificationTypePref> = {
  wallet_topup: { mode: "in_app", soundId: "sound1", label: "Wallet Top-Up Requests" },
  new_order: { mode: "in_app", soundId: "sound2", label: "New Orders" },
  support_message: { mode: "in_app", soundId: "sound3", label: "Driver Support Messages" },
}

export const SOUND_MODE_HINTS: Record<SoundMode, string> = {
  in_app: "Soft chime played from the browser tab while it's open",
  system: "Uses your OS/browser notification sound, same as any other site",
  off: "Banner only, no sound",
}

function readPrefs(): Record<string, NotificationTypePref> {
  if (typeof window === "undefined") return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) }
  } catch (error) {
    console.error("[notifications-service] readPrefs failed:", error)
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }
}

function writePrefs(prefs: Record<string, NotificationTypePref>) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (error) {
    console.error("[notifications-service] writePrefs failed:", error)
  }
}

// A short beep synthesized with the Web Audio API — no bundled asset files
// needed, unlike the app's expo-audio .mp3s. Each sound id maps to a
// distinct pitch so the picker still lets an admin tell the six apart.
const SOUND_FREQUENCIES: Record<string, number> = {
  sound1: 660,
  sound2: 880,
  sound3: 528,
  sound4: 784,
  sound5: 440,
  sound6: 990,
}

function playSound(soundId: string) {
  if (typeof window === "undefined") return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = SOUND_FREQUENCIES[soundId] || 660
    osc.type = "sine"
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    osc.onended = () => ctx.close()
  } catch (error) {
    console.error("[notifications-service] playSound failed:", error)
  }
}

// Platform-wide default for drivers & customers, shared with the mobile app
// via `app_settings` (same key + shape as notificationPreferences.js).
export type DefaultUserSound = { mode: SoundMode; soundId: string }
export const FALLBACK_DEFAULT_USER_SOUND: DefaultUserSound = { mode: "in_app", soundId: "sound1" }

async function getDefaultUserSound(): Promise<DefaultUserSound> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", DEFAULT_USER_SOUND_SETTINGS_KEY)
    .single()
  if (!error && data?.value) {
    try {
      return { ...FALLBACK_DEFAULT_USER_SOUND, ...JSON.parse(data.value) }
    } catch {
      return { ...FALLBACK_DEFAULT_USER_SOUND }
    }
  }
  return { ...FALLBACK_DEFAULT_USER_SOUND }
}

async function setDefaultUserSound(mode: SoundMode, soundId: string): Promise<DefaultUserSound> {
  const updated = { mode, soundId }
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: DEFAULT_USER_SOUND_SETTINGS_KEY, value: JSON.stringify(updated), updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) {
    console.error("[notifications-service] setDefaultUserSound failed:", error)
    throw error
  }
  return updated
}

export const notificationsService = {
  getFeed,
  loadRecipients,
  sendToAll,
  sendToSelected,
  sendToDriversByCategory,
  getPrefs: readPrefs,
  setPrefMode(type: string, mode: SoundMode) {
    const all = readPrefs()
    const updated = { ...all, [type]: { ...(all[type] || DEFAULT_NOTIFICATION_PREFERENCES[type]), mode } }
    writePrefs(updated)
    return updated
  },
  setPrefSound(type: string, soundId: string) {
    const all = readPrefs()
    const updated = { ...all, [type]: { ...(all[type] || DEFAULT_NOTIFICATION_PREFERENCES[type]), soundId } }
    writePrefs(updated)
    return updated
  },
  playSound,
  getDefaultUserSound,
  setDefaultUserSound,
}
