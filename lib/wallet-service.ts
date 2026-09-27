// Admin-side wallet top-up service for the operations website. Mirrors the
// mobile app's src/services/walletTopupService.js admin functions, adapted to
// the browser: it talks to the same Supabase project, respects the same RLS
// (an admin must be signed in), and writes the same in-app `notifications`
// rows the driver's phone reads. Push notifications are handled by the mobile
// backend, so they are intentionally omitted here.

import { supabase } from "./supabase"
import { getCurrencySymbolForCountry } from "./countries"

export type TopUpStatus = "pending" | "approved" | "rejected"

export type DriverInfo = {
  id: string
  name: string | null
  phone_number: string | null
  country?: string | null
}

export type TopUpRequest = {
  id: string
  driver_id: string
  amount_claimed: number | string | null
  amount_verified: number | string | null
  status: TopUpStatus
  admin_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  country: string | null
  created_at: string
  updated_at: string
  driver?: DriverInfo | null
}

export type TopUpMessage = {
  id: string
  request_id: string
  sender_id: string
  sender_role: "driver" | "admin"
  message: string | null
  image_url: string | null
  image_path: string | null
  created_at: string
}

type ServiceResult<T> = { data: T; error: unknown }

export const walletService = {
  async getAllTopUpRequests(
    status: TopUpStatus | null = null,
  ): Promise<ServiceResult<TopUpRequest[]>> {
    try {
      let query = supabase
        .from("wallet_topup_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (status) query = query.eq("status", status)

      const { data: rows, error } = await query
      if (error) throw error

      const requests = (rows || []) as TopUpRequest[]
      const driverIds = [...new Set(requests.map((r) => r.driver_id).filter(Boolean))]

      if (driverIds.length > 0) {
        const { data: driverRows, error: driverError } = await supabase
          .from("users")
          .select("id, name, phone_number, country")
          .in("id", driverIds)

        if (driverError) {
          console.error("[v0] Error loading driver profiles:", driverError)
          return { data: requests, error: driverError }
        }

        const driverById = new Map((driverRows || []).map((d) => [d.id, d as DriverInfo]))
        for (const request of requests) {
          request.driver = driverById.get(request.driver_id) || null
        }
      }

      return { data: requests, error: null }
    } catch (error) {
      console.error("[v0] Error getting top-up requests:", error)
      return { data: [], error }
    }
  },

  async getTopUpRequestById(requestId: string): Promise<ServiceResult<TopUpRequest | null>> {
    try {
      const { data: row, error } = await supabase
        .from("wallet_topup_requests")
        .select("*")
        .eq("id", requestId)
        .single()

      if (error) throw error

      const request = row as TopUpRequest
      if (request?.driver_id) {
        const { data: driver } = await supabase
          .from("users")
          .select("id, name, phone_number, country")
          .eq("id", request.driver_id)
          .single()
        request.driver = (driver as DriverInfo) || null
      }

      return { data: request, error: null }
    } catch (error) {
      console.error("[v0] Error getting top-up request:", error)
      return { data: null, error }
    }
  },

  // Realtime updates for a single request row — mirrors the mobile app so an
  // admin sitting in the chat sees the status flip if it changes elsewhere.
  subscribeToTopUpRequest(requestId: string, callback: (request: TopUpRequest) => void) {
    return supabase
      .channel(`topup-request-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallet_topup_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => callback(payload.new as TopUpRequest),
      )
      .subscribe()
  },

  async getTopUpMessages(requestId: string): Promise<ServiceResult<TopUpMessage[]>> {
    try {
      const { data, error } = await supabase
        .from("wallet_topup_messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true })

      if (error) throw error
      return { data: (data || []) as TopUpMessage[], error: null }
    } catch (error) {
      console.error("[v0] Error getting top-up messages:", error)
      return { data: [], error }
    }
  },

  async sendAdminMessage(
    requestId: string,
    adminId: string,
    message: string,
  ): Promise<ServiceResult<TopUpMessage | null>> {
    try {
      const { data, error } = await supabase
        .from("wallet_topup_messages")
        .insert({
          request_id: requestId,
          sender_id: adminId,
          sender_role: "admin",
          message: message?.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      await supabase
        .from("wallet_topup_requests")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", requestId)

      return { data: data as TopUpMessage, error: null }
    } catch (error) {
      console.error("[v0] Error sending admin message:", error)
      return { data: null, error }
    }
  },

  subscribeToTopUpMessages(requestId: string, callback: (message: TopUpMessage) => void) {
    return supabase
      .channel(`topup-messages-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wallet_topup_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => callback(payload.new as TopUpMessage),
      )
      .subscribe()
  },

  subscribeToNewTopUpRequests(callback: () => void) {
    return supabase
      .channel("wallet-topup-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_topup_requests" },
        () => callback(),
      )
      .subscribe()
  },

  // Atomic wallet credit — same RPC the mobile app uses so a top-up can never
  // race with a commission deduction and silently lose one.
  async creditWallet(driverId: string, amount: number) {
    const { data: adjustResult, error: adjustError } = await supabase.rpc(
      "adjust_driver_credit_balance",
      {
        p_driver_id: driverId,
        p_delta: amount,
        p_floor_at_zero: false,
        p_increment_orders: false,
      },
    )
    if (adjustError) throw adjustError

    const adjustRow = Array.isArray(adjustResult) ? adjustResult[0] : adjustResult
    const newBalance = parseFloat(adjustRow.new_balance)

    const { error: ledgerError } = await supabase.from("driver_payments").insert({
      driver_id: driverId,
      amount,
      payment_method: "orange_money",
      status: "completed",
      reference: `TOPUP-${Date.now()}`,
      metadata: { type: "credit_topup", balance_after: newBalance },
    })
    if (ledgerError) {
      console.error("[v0] Balance credited but ledger entry failed:", ledgerError)
    }

    return newBalance
  },

  async approveTopUpRequest(
    request: TopUpRequest,
    verifiedAmount: number,
    adminId: string,
    note = "",
  ) {
    try {
      const newBalance = await this.creditWallet(request.driver_id, verifiedAmount)
      const symbol = getCurrencySymbolForCountry(request.country || request.driver?.country)

      const { error: updateError } = await supabase
        .from("wallet_topup_requests")
        .update({
          status: "approved",
          admin_note: note || null,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          amount_verified: verifiedAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)
      if (updateError) throw updateError

      await supabase.from("wallet_topup_messages").insert({
        request_id: request.id,
        sender_id: adminId,
        sender_role: "admin",
        message: `Approved. ${symbol}${verifiedAmount.toFixed(2)} credited to your wallet.${note ? ` Note: ${note}` : ""}`,
      })

      await supabase.from("notifications").insert({
        user_id: request.driver_id,
        title: "Wallet Top-Up Approved",
        message: `${symbol}${verifiedAmount.toFixed(2)} has been added to your wallet. New balance: ${symbol}${newBalance.toFixed(2)}.`,
        type: "topup_approved",
        data: { type: "topup_approved", requestId: request.id },
        read: false,
        background_color: "#4CAF50",
        letter: "W",
        created_at: new Date().toISOString(),
      })

      return { success: true, newBalance }
    } catch (error) {
      console.error("[v0] Error approving top-up request:", error)
      return { success: false, error }
    }
  },

  async rejectTopUpRequest(request: TopUpRequest, reason: string, adminId: string) {
    try {
      const { error: updateError } = await supabase
        .from("wallet_topup_requests")
        .update({
          status: "rejected",
          admin_note: reason || null,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)
      if (updateError) throw updateError

      await supabase.from("wallet_topup_messages").insert({
        request_id: request.id,
        sender_id: adminId,
        sender_role: "admin",
        message: `Rejected. ${reason || "Please resend a clear Proof of Payment."}`,
      })

      await supabase.from("notifications").insert({
        user_id: request.driver_id,
        title: "Wallet Top-Up Rejected",
        message: reason || "Your Proof of Payment could not be verified. Please check the chat.",
        type: "topup_rejected",
        data: { type: "topup_rejected", requestId: request.id },
        read: false,
        background_color: "#F44336",
        letter: "W",
        created_at: new Date().toISOString(),
      })

      return { success: true }
    } catch (error) {
      console.error("[v0] Error rejecting top-up request:", error)
      return { success: false, error }
    }
  },

  async searchDrivers(query: string): Promise<ServiceResult<DriverInfo[]>> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, phone_number, country")
        .eq("role", "driver")
        .or(`name.ilike.%${query}%,phone_number.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      return { data: (data || []) as DriverInfo[], error: null }
    } catch (error) {
      console.error("[v0] Error searching drivers:", error)
      return { data: [], error }
    }
  },

  async manualTopUp(driver: DriverInfo, amount: number, adminId: string, note = "") {
    try {
      if (!amount || amount <= 0) {
        return { success: false, error: { message: "Enter an amount greater than 0." } }
      }

      const newBalance = await this.creditWallet(driver.id, amount)
      const symbol = getCurrencySymbolForCountry(driver.country)

      const { data: request, error: insertError } = await supabase
        .from("wallet_topup_requests")
        .insert({
          driver_id: driver.id,
          amount_claimed: amount,
          amount_verified: amount,
          status: "approved",
          admin_note: note || "Manual top-up added by admin",
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          country: driver.country || null,
        })
        .select()
        .single()
      if (insertError) throw insertError

      await supabase.from("wallet_topup_messages").insert({
        request_id: request.id,
        sender_id: adminId,
        sender_role: "admin",
        message: `${symbol}${amount.toFixed(2)} added manually by admin.${note ? ` Note: ${note}` : ""}`,
      })

      await supabase.from("notifications").insert({
        user_id: driver.id,
        title: "Wallet Top-Up Added",
        message: `${symbol}${amount.toFixed(2)} has been added to your wallet. New balance: ${symbol}${newBalance.toFixed(2)}.`,
        type: "topup_approved",
        data: { type: "topup_approved", requestId: request.id },
        read: false,
        background_color: "#4CAF50",
        letter: "W",
        created_at: new Date().toISOString(),
      })

      return { success: true, newBalance, request: request as TopUpRequest }
    } catch (error) {
      console.error("[v0] Error adding manual top-up:", error)
      return { success: false, error }
    }
  },
}
