// Admin-side banners service for the operations website. Mirrors the
// mobile app's src/Screens/AdminScreen/AdminBanners.js: the same `banners`
// table and `banners` Supabase Storage bucket, scoped per country and per
// placement, that the customer-facing screens in the native app read from.
// A banner added here shows up in the native app immediately (and vice
// versa) — both sides read the identical rows.

import { supabase } from "./supabase"

const BUCKET = "banners"

// Three placements share this table (a `placement` column distinguishes
// them): 'top' is the slideshow at the very top of the customer Home
// screen, 'secondary' is its own section further down the Home screen
// (between Diesel and Accessories), and 'pronto' is a slideshow on the
// Pronto screen (Appliances & Accessories). Secondary is title-only and
// Pronto is image-only on the customer side — see PLACEMENTS below.
export type BannerPlacement = "top" | "secondary" | "pronto"

export const PLACEMENTS: { key: BannerPlacement; label: string; hint: string }[] = [
  {
    key: "top",
    label: "Home Banner",
    hint: "Shown in the slideshow at the top of the customer Home screen.",
  },
  {
    key: "secondary",
    label: "Secondary Banner",
    hint: "Its own section on the customer Home screen, between Diesel and Accessories.",
  },
  {
    key: "pronto",
    label: "Pronto Banner",
    hint: "Shown on the Pronto screen (Appliances & Accessories), above the Accessories section. Image only.",
  },
]

export type Banner = {
  id: string
  image: string
  title: string | null
  titletwo: string | null
  description: string | null
  is_active: boolean
  placement: BannerPlacement
  country: string
  sort_order: number | null
  created_at: string
}

async function getAllBanners(
  placement: BannerPlacement,
  country: string,
): Promise<{ data: Banner[]; error: string | null }> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("placement", placement)
    .eq("country", country)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[banners-service] getAllBanners failed:", error)
    return { data: [], error: "Could not load banners. Try refreshing." }
  }
  return { data: (data || []) as Banner[], error: null }
}

async function uploadImage(file: File): Promise<{ success: boolean; path?: string; url?: string; error?: string }> {
  try {
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      throw new Error(`Image too large. Max size: 5MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    }
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const filePath = `${timestamp}_${random}_banner.jpg`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: true,
    })
    if (uploadError) throw new Error(uploadError.message || "Upload failed")
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return { success: true, path: filePath, url: data.publicUrl }
  } catch (error: any) {
    console.error("[banners-service] uploadImage failed:", error)
    return { success: false, error: error?.message || "Upload failed" }
  }
}

async function saveBanner(input: {
  placement: BannerPlacement
  country: string
  imageFile: File | null
  existingImageUrl: string | null
  title: string
  titletwo: string
  description: string
  editingBanner: Banner | null
}): Promise<{ error: string | null }> {
  const { placement, country, imageFile, existingImageUrl, title, description, editingBanner } = input

  let imageUrl = existingImageUrl
  if (imageFile) {
    const uploaded = await uploadImage(imageFile)
    if (!uploaded.success || !uploaded.url) {
      return { error: uploaded.error || "Could not upload image." }
    }
    imageUrl = uploaded.url
  }
  if (!imageUrl) {
    return { error: "Please pick a banner image." }
  }
  // Pronto banner is image-only on the customer side, so it's the one
  // placement that doesn't need a title to save.
  if (placement !== "pronto" && !title.trim()) {
    return { error: "Please enter a title for the banner." }
  }

  const payload = {
    image: imageUrl,
    title: title.trim() || null,
    // Secondary is title-only and Pronto is image-only on the customer
    // side (no subtitle row on either), so neither ever sends a titletwo.
    titletwo: placement === "secondary" || placement === "pronto" ? null : input.titletwo.trim() || null,
    description: description.trim() || null,
  }

  if (editingBanner) {
    const { error } = await supabase.from("banners").update(payload).eq("id", editingBanner.id)
    if (error) {
      console.error("[banners-service] update failed:", error)
      return { error: "Could not save banner." }
    }
  } else {
    const { error } = await supabase.from("banners").insert({ ...payload, is_active: true, placement, country })
    if (error) {
      console.error("[banners-service] insert failed:", error)
      return { error: "Could not save banner." }
    }
  }

  return { error: null }
}

async function toggleActive(banner: Banner): Promise<{ error: string | null }> {
  const { error } = await supabase.from("banners").update({ is_active: !banner.is_active }).eq("id", banner.id)
  if (error) {
    console.error("[banners-service] toggleActive failed:", error)
    return { error: "Could not update banner." }
  }
  return { error: null }
}

async function deleteBanner(banner: Banner): Promise<{ error: string | null }> {
  // Best-effort remove the underlying file too, matching the mobile app.
  if (banner.image) {
    const path = banner.image.split("/").pop()?.split("?")[0]
    if (path) await supabase.storage.from(BUCKET).remove([path])
  }
  const { error } = await supabase.from("banners").delete().eq("id", banner.id)
  if (error) {
    console.error("[banners-service] deleteBanner failed:", error)
    return { error: "Could not delete banner." }
  }
  return { error: null }
}

export const bannersService = {
  getAllBanners,
  saveBanner,
  toggleActive,
  deleteBanner,
}
