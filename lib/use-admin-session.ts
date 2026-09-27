"use client"

import { useEffect, useState } from "react"
import { supabase } from "./supabase"

export type AdminUser = {
  id: string
  name: string | null
  email: string | null
  role: string | null
  admin_type: string | null
}

type AdminSessionState = {
  loading: boolean
  admin: AdminUser | null
}

// Resolves the signed-in Supabase user and confirms they are an admin in the
// shared `users` table. The wallet tables are protected by RLS that only lets
// an admin account read/write them, so a non-admin (or signed-out) visitor
// simply resolves to `admin: null` and the page redirects them out.
export function useAdminSession(): AdminSessionState {
  const [state, setState] = useState<AdminSessionState>({ loading: true, admin: null })

  useEffect(() => {
    let active = true

    async function resolve() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (active) setState({ loading: false, admin: null })
        return
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id, name, email, role, admin_type")
        .eq("id", user.id)
        .single()

      if (!active) return

      if (profile?.role === "admin") {
        setState({ loading: false, admin: profile as AdminUser })
      } else {
        setState({ loading: false, admin: null })
      }
    }

    resolve()

    const { data: sub } = supabase.auth.onAuthStateChange(() => resolve())
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}
