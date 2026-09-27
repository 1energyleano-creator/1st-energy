// Admin-side emergency fuel products service for the operations website.
// Mirrors the mobile app's src/Screens/AdminScreen/AdminFuelProducts.js:
// the same `fuel_products` table, scoped per country, that customers see
// as petrol/diesel options in Emergency Delivery. Separate from the
// general `products` table the Products page manages.

import { supabase } from "./supabase"

// Emergency fuel delivery is petrol/diesel only — fixed list, same as the app.
export const FUEL_CATEGORIES = ["petrol", "diesel"] as const
export type FuelCategory = (typeof FUEL_CATEGORIES)[number]

export type FuelProduct = {
  id: string
  title: string
  category: FuelCategory
  price: number
  image: string
  available: boolean
  country: string
  created_at: string
}

async function getAllFuelProducts(country: string): Promise<{ data: FuelProduct[]; error: string | null }> {
  const { data, error } = await supabase
    .from("fuel_products")
    .select("*")
    .eq("country", country)
    .order("category", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[fuel-products-service] getAllFuelProducts failed:", error)
    return { data: [], error: "Could not load fuel products. Try refreshing." }
  }
  return { data: (data || []) as FuelProduct[], error: null }
}

async function saveFuelProduct(
  input: { title: string; category: FuelCategory; price: string; image: string; available: boolean },
  country: string,
  editingProduct: FuelProduct | null,
): Promise<{ error: string | null }> {
  const title = input.title.trim()
  if (!title) return { error: 'Please enter a product title, e.g. "Petrol 95".' }

  const priceNumber = Number(input.price)
  if (!input.price || Number.isNaN(priceNumber) || priceNumber <= 0) {
    return { error: "Please enter a price per litre greater than 0." }
  }

  const image = input.image.trim()
  if (!image) return { error: "Please enter an image URL for this fuel product." }

  const payload = {
    title,
    category: input.category,
    price: priceNumber,
    image,
    available: input.available,
    // New products belong to whichever country is selected — editing an
    // existing product keeps its original country.
    country: editingProduct ? editingProduct.country : country,
  }

  if (editingProduct) {
    const { error } = await supabase.from("fuel_products").update(payload).eq("id", editingProduct.id)
    if (error) {
      console.error("[fuel-products-service] update failed:", error)
      return { error: "Could not save fuel product." }
    }
  } else {
    const { error } = await supabase.from("fuel_products").insert(payload)
    if (error) {
      console.error("[fuel-products-service] insert failed:", error)
      return { error: "Could not save fuel product." }
    }
  }

  return { error: null }
}

async function toggleAvailable(product: FuelProduct): Promise<{ error: string | null }> {
  const { error } = await supabase.from("fuel_products").update({ available: !product.available }).eq("id", product.id)
  if (error) {
    console.error("[fuel-products-service] toggleAvailable failed:", error)
    return { error: "Could not update fuel product." }
  }
  return { error: null }
}

async function deleteFuelProduct(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("fuel_products").delete().eq("id", id)
  if (error) {
    console.error("[fuel-products-service] deleteFuelProduct failed:", error)
    return { error: "Could not delete fuel product." }
  }
  return { error: null }
}

export const fuelProductsService = {
  getAllFuelProducts,
  saveFuelProduct,
  toggleAvailable,
  deleteFuelProduct,
}
