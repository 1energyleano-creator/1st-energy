// Admin-side product catalog service for the operations website. Mirrors
// the mobile app's src/services/adminProductService.js and the app_settings
// keys read/written by src/Screens/AdminScreen/AdminProducts.js, so the
// website manages the exact same `products` / `categories` / `app_settings`
// rows and the same `product-images` Supabase Storage bucket the mobile app
// uses. Image upload here takes a browser File instead of an Expo
// ImagePicker asset.

import { supabase } from "./supabase"

const BUCKET = "product-images"

export type Product = {
  id: string
  title: string
  brand: string | null
  cylinder: string | null
  price: number | string | null
  description: string | null
  category: string | null
  unit: string | null
  quantity: number | string | null
  available: boolean
  image: string | null
  country: string
  created_at: string
  updated_at: string
}

export type ProductStats = {
  totalProducts: number
  availableProducts: number
  outOfStock: number
  categories: number
}

export type Category = {
  id: string
  name: string
  icon: string | null
  sort_order: number | null
  active: boolean
  country: string
}

type ServiceResult<T> = { data: T; error: unknown }

export const DEFAULT_GAS_BRANDS = ["Tswana Gas", "Simsa Gas", "Easi Gas", "HandiGas-Afrox", "BC & LM Gas"]
export const DEFAULT_CYLINDER_SIZES = ["9KG", "14KG", "19KG", "48KG"]

export const getProductImageUrl = (storagePath: string | null): string | null => {
  if (!storagePath) return null
  if (storagePath.startsWith("http")) return storagePath
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const url = data.publicUrl
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}t=${Date.now()}`
}

async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).single()
  if (error || !data) return null
  return data.value as string
}

async function setSetting(key: string, value: string) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) throw error
}

export const productsService = {
  async getAllProducts(country: string): Promise<ServiceResult<Product[]>> {
    try {
      if (!country) throw new Error("country is required to fetch products")
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("country", country)
        .order("created_at", { ascending: false })
      if (error) throw error
      return { data: (data as Product[]) || [], error: null }
    } catch (error) {
      console.error("Error fetching products:", error)
      return { data: [], error }
    }
  },

  async getProductStats(country: string): Promise<ServiceResult<ProductStats | null>> {
    try {
      if (!country) throw new Error("country is required")
      const { data, error } = await supabase.from("products").select("category, available, quantity").eq("country", country)
      if (error) throw error
      const rows = data || []
      const categories = new Set(rows.map((p: any) => (p.category || "").trim()).filter((c: string) => c.length > 0))
      return {
        data: {
          totalProducts: rows.length,
          availableProducts: rows.filter((p: any) => p.available !== false).length,
          outOfStock: rows.filter((p: any) => Number(p.quantity) <= 0).length,
          categories: categories.size,
        },
        error: null,
      }
    } catch (error) {
      console.error("Error fetching product stats:", error)
      return { data: null, error }
    }
  },

  async getCategoryOptions(country: string): Promise<ServiceResult<Category[]>> {
    try {
      if (!country) throw new Error("country is required")
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("country", country)
        .eq("active", true)
        .order("sort_order", { ascending: true })
      if (error) throw error
      return { data: (data as Category[]) || [], error: null }
    } catch (error) {
      console.error("Error fetching categories:", error)
      return { data: [], error }
    }
  },

  async createProduct(payload: Partial<Product>): Promise<ServiceResult<Product | null>> {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert([{ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        .select()
        .single()
      if (error) throw error
      return { data: data as Product, error: null }
    } catch (error) {
      console.error("Error creating product:", error)
      return { data: null, error }
    }
  },

  async updateProduct(id: string, payload: Partial<Product>): Promise<ServiceResult<Product | null>> {
    try {
      const { data, error } = await supabase
        .from("products")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return { data: data as Product, error: null }
    } catch (error) {
      console.error("Error updating product:", error)
      return { data: null, error }
    }
  },

  async deleteProduct(id: string): Promise<ServiceResult<null>> {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      console.error("Error deleting product:", error)
      return { data: null, error }
    }
  },

  async setAvailability(id: string, available: boolean): Promise<ServiceResult<null>> {
    try {
      const { error } = await supabase
        .from("products")
        .update({ available, updated_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      console.error("Error updating availability:", error)
      return { data: null, error }
    }
  },

  async uploadImage(file: File): Promise<{ success: boolean; path?: string; url?: string; error?: string }> {
    try {
      const MAX_SIZE = 5 * 1024 * 1024
      if (file.size > MAX_SIZE) {
        throw new Error(`Image too large. Max size: 5MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      }
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const filePath = `${timestamp}_${random}_${safeName}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
        upsert: true,
      })
      if (uploadError) throw new Error(uploadError.message || "Upload failed")
      return { success: true, path: filePath, url: getProductImageUrl(filePath) || undefined }
    } catch (error: any) {
      console.error("Error uploading product image:", error)
      return { success: false, error: error?.message || "Upload failed" }
    }
  },

  // app_settings-backed catalog config, shared with the mobile app's admin
  // screen: cylinder deposit price, fuel minimum order amount, editable
  // cylinder size list, and editable gas brand list.
  async getCylinderPrice(): Promise<number | null> {
    const value = await getSetting("cylinder_price")
    return value != null ? Number(value) : null
  },
  async setCylinderPrice(price: number) {
    await setSetting("cylinder_price", String(price))
  },

  async getMinimumOrder(): Promise<number> {
    const value = await getSetting("minimum_order_amount")
    return value != null ? Number(value) : 500
  },
  async setMinimumOrder(amount: number) {
    await setSetting("minimum_order_amount", String(amount))
  },

  async getCylinderSizes(): Promise<string[]> {
    const value = await getSetting("cylinder_sizes")
    if (!value) return DEFAULT_CYLINDER_SIZES
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CYLINDER_SIZES
    } catch {
      return DEFAULT_CYLINDER_SIZES
    }
  },
  async setCylinderSizes(sizes: string[]) {
    await setSetting("cylinder_sizes", JSON.stringify(sizes))
  },

  async getGasBrands(): Promise<string[]> {
    const value = await getSetting("gas_brands")
    if (!value) return DEFAULT_GAS_BRANDS
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GAS_BRANDS
    } catch {
      return DEFAULT_GAS_BRANDS
    }
  },
  async setGasBrands(brands: string[]) {
    await setSetting("gas_brands", JSON.stringify(brands))
  },
}

export const normalizeCategory = (category?: string | null) => (category || "").trim().toLowerCase()
export const isGasCategory = (category?: string | null) => normalizeCategory(category).includes("gas")
