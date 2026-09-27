"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Minus, Plus, Search, User, X } from "lucide-react"
import { getCurrencySymbolForCountry } from "@/lib/countries"
import { customersService, type Customer } from "@/lib/customers-service"
import { productsService, type Product } from "@/lib/products-service"
import { ordersService, type NewOrderLine } from "@/lib/orders-service"

const PAYMENT_METHODS = ["Cash", "Card", "Mobile Money", "Wallet"]

export function NewOrderModal({
  country,
  onClose,
  onCreated,
}: {
  country: string
  onClose: () => void
  onCreated: () => void
}) {
  const symbol = getCurrencySymbolForCountry(country)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [customerSearch, setCustomerSearch] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [fullName, setFullName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0])
  const [category, setCategory] = useState("")

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [productSearch, setProductSearch] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setLoadingOptions(true)
    Promise.all([customersService.getAllCustomers(country), productsService.getAllProducts(country)]).then(([c, p]) => {
      setCustomers(c.data)
      setProducts(p.data.filter((prod) => prod.available))
      setLoadingOptions(false)
    })
  }, [country])

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers.slice(0, 20)
    return customers.filter((c) => c.name?.toLowerCase().includes(q) || c.phone_number?.toLowerCase().includes(q)).slice(0, 20)
  }, [customers, customerSearch])

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
  }, [products, productSearch])

  const selectCustomer = (c: Customer) => {
    setCustomer(c)
    setFullName(c.name || "")
    setPhoneNumber(c.phone_number || "")
    setAddress(c.city || "")
  }

  const setQty = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[productId] || 0) + delta)
      return { ...prev, [productId]: next }
    })
  }

  const lines: NewOrderLine[] = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => {
          const product = products.find((p) => p.id === productId)
          return { productId, title: product?.title || "Product", price: Number(product?.price || 0), quantity: qty }
        }),
    [quantities, products],
  )

  const orderTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)

  const handleSubmit = async () => {
    setFormError(null)
    if (!fullName.trim() || !phoneNumber.trim() || !address.trim()) {
      setFormError("Please fill in the customer's name, phone number and address.")
      return
    }
    if (lines.length === 0) {
      setFormError("Add at least one product to the order.")
      return
    }

    setSubmitting(true)
    const result = await ordersService.createOrder({
      country,
      userId: customer?.id || null,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      paymentMethod,
      category: category || null,
      lines,
    })
    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || "Could not create the order.")
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
          <h2 className="text-lg font-bold">New order</h2>
          <button onClick={onClose} aria-label="Close"><X className="size-5" /></button>
        </div>

        {loadingOptions ? (
          <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-[var(--muted)]" /></div>
        ) : (
          <div className="space-y-6 px-6 py-6">
            <section>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Customer</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search an existing customer, or leave blank for a walk-in"
                  className="h-10 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)]"
                />
              </div>
              {customerSearch && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[var(--line)]">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        selectCustomer(c)
                        setCustomerSearch("")
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f5f7fb]"
                    >
                      <User className="size-3.5 text-[var(--muted)]" />
                      {c.name || "Customer"} <span className="text-xs text-[var(--muted)]">{c.phone_number}</span>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && <p className="px-3 py-2 text-xs text-[var(--muted)]">No matches.</p>}
                </div>
              )}
              {customer && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-[#fff4ec] px-3 py-2 text-xs font-semibold text-[var(--orange)]">
                  Linked to {customer.name}
                  <button
                    onClick={() => {
                      setCustomer(null)
                    }}
                    className="text-[var(--muted)]"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
                />
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number"
                  className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
                />
              </div>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Delivery address"
                className="mt-3 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
              />

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category (optional)"
                  className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
                />
              </div>
            </section>

            <section>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Products</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products"
                  className="h-10 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)]"
                />
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[var(--line)] p-2">
                {filteredProducts.map((p) => {
                  const qty = quantities[p.id] || 0
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-[#f5f7fb]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {symbol}
                          {Number(p.price || 0).toFixed(2)} {p.category ? `· ${p.category}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setQty(p.id, -1)} disabled={qty === 0} className="flex size-7 items-center justify-center rounded-lg bg-[#f5f7fb] disabled:opacity-40">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold">{qty}</span>
                        <button onClick={() => setQty(p.id, 1)} className="flex size-7 items-center justify-center rounded-lg bg-[var(--orange)] text-white">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {filteredProducts.length === 0 && <p className="px-2 py-4 text-center text-xs text-[var(--muted)]">No products found for this country.</p>}
              </div>
            </section>

            {lines.length > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-[#f5f7fb] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--muted)]">{lines.length} item{lines.length === 1 ? "" : "s"}</p>
                <p className="text-sm font-bold text-[var(--orange)]">
                  {symbol}
                  {orderTotal.toFixed(2)}
                </p>
              </div>
            )}

            {formError && <p className="rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{formError}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Create order
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
