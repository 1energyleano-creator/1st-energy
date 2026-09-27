import { createClient } from "@supabase/supabase-js"

// Shared with the 1st Energy mobile app — the admin website reads and writes
// the same Supabase project so admins review the real wallet top-up requests
// drivers submit from their phones. These are the public project URL and anon
// key (the same ones shipped inside the mobile app bundle); all privileged
// access is still gated by Supabase Row Level Security, which only lets a
// signed-in admin account touch the wallet tables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jnbwjzlpwmnvgliyhhbf.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYndqemxwd21udmdsaXloaGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NDI4NjQsImV4cCI6MjEwMTAxODg2NH0.XQkA93gHsG8nOJkt4CERv2MKBSx-RYSLclAgipt3L3Q"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
