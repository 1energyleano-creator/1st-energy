"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Eraser,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCurrencySymbolForCountry } from "@/lib/countries"
import {
  ordersService,
  STATUS_OPTIONS,
  resolveItemName,
  resolveItemPrice,
  type Order,
  type OrderStatus,
  type OrderItem,
  type OrderStatusUpdate,
  type AvailableDriver,
} from "@/lib/orders-service"
import { customersService, type Customer } from "@/lib/customers-service"
import { productsService, type Product } from "@/lib/products-service"
import { NewOrderModal } from "@/components/orders/new-order-modal"

const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pending", color: "#B45309", bg: "#FEF3E2", icon: Clock },
  accepted: { label: "Accepted", color: "#047857", bg: "#E7F7EF", icon: CheckCircle2 },
  picked_up: { label: "Picked Up", color: "#1D4ED8", bg: "#E9F1FE", icon: Package },
  on_the_way: { label: "On the Way", color: "#6D28D9", bg: "#F1EBFE", icon: Truck },
  delivered: { label: "Delivered", color: "#475569", bg: "#F1F5F9", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "#B91C1C", bg: "#FEE9E9", icon: XCircle },
}

const DATE_FILTERS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
] as const

type DateFilter = (typeof DATE_FILTERS)[number]["id"]

function timeAgo(iso: string | null) {
  if (!iso) return "—"
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function OrdersManagementPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()
  const isMainAdmin = admin?.admin_type !== "sub"

  const [country, setCountry] = useState(DEFAULT_COUNTRY_CODE)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearingHistory, setClearingHistory] = useState(false)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")

  const [selected, setSelected] = useState<Order | null>(null)
  const [showNewOrder, setShowNewOrder] = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await ordersService.getAllOrders(country)
    setOrders(data)
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  const stats = useMemo(() => ordersService.getOrderStats(orders), [orders])

  const filtered = useMemo(() => {
    let rows = orders
    if (statusFilter !== "all") rows = rows.filter((o) => o.status === statusFilter)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.full_name?.toLowerCase().includes(q) ||
          o.user?.name?.toLowerCase().includes(q) ||
          o.address?.toLowerCase().includes(q) ||
          o.phone_number?.toLowerCase().includes(q),
      )
    }

    if (dateFilter !== "all") {
      const now = new Date()
      const start = new Date()
      if (dateFilter === "today") start.setHours(0, 0, 0, 0)
      if (dateFilter === "week") start.setDate(now.getDate() - 7)
      if (dateFilter === "month") start.setMonth(now.getMonth() - 1)
      rows = rows.filter((o) => new Date(o.created_at) >= start)
    }

    return rows
  }, [orders, statusFilter, search, dateFilter])

  const handleClearHistory = async () => {
    if (!admin) return
    if (!confirm("This hides delivered and cancelled orders from this list. It does NOT cancel, delete, or change any order. Continue?")) return
    setClearingHistory(true)
    const result = await ordersService.clearOrderHistory(admin.id)
    setClearingHistory(false)
    if (!result.success) {
      alert(result.error || "Could not clear history.")
      return
    }
    load()
  }

  if (authLoading || !admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--cream)] text-[var(--muted)]">
        <p className="text-sm">Checking your access…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <header className="flex h-20 items-center justify-between border-b border-[var(--line)] px-5 sm:px-8">
        <Link href="/operations/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Deliveries</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Orders</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Create, assign and track every order for the selected country.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <button onClick={load} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {isMainAdmin && (
              <button
                onClick={handleClearHistory}
                disabled={clearingHistory}
                className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-60"
              >
                {clearingHistory ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}
                Clear history
              </button>
            )}
            <button
              onClick={() => setShowNewOrder(true)}
              className="flex items-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3 text-xs font-bold text-white"
            >
              <Plus className="size-4" />
              New order
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total", stats.total, Activity, "#3B82F6"],
            ["Pending", stats.pending, Clock, "#F59E0B"],
            ["Active", stats.active, Truck, "#8B5CF6"],
            ["Delivered", stats.delivered, CheckCircle2, "#10B981"],
            ["Cancelled", stats.cancelled, XCircle, "#EF4444"],
          ].map(([label, value, Icon, color]: any) => (
            <article key={label} className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
                <Icon className="size-4" style={{ color }} />
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order, customer, address, phone…"
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)]"
            />
          </div>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {filtered.length} of {orders.length} order{orders.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-xl px-3 py-2 text-[11px] font-bold ${statusFilter === "all" ? "bg-[var(--dark)] text-white" : "bg-white text-[var(--muted)] border border-[var(--line)]"}`}
          >
            All statuses
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`rounded-xl px-3 py-2 text-[11px] font-bold ${statusFilter === s.id ? "bg-[var(--dark)] text-white" : "bg-white text-[var(--muted)] border border-[var(--line)]"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                dateFilter === f.id ? "bg-[#fff0e6] text-[#c45c1d]" : "bg-white text-[var(--muted)] border border-[var(--line)]"
              }`}
            >
              <Calendar className="size-3" />
              {f.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}

        {loading ? (
          <div className="mt-10 flex justify-center"><Loader2 className="size-6 animate-spin text-[var(--muted)]" /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
            <Package className="size-8 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">No orders match these filters.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order) => {
              const meta = STATUS_META[order.status || "pending"] || STATUS_META.pending
              const StatusIcon = meta.icon
              return (
                <button
                  key={order.id}
                  onClick={() => setSelected(order)}
                  className="flex flex-col rounded-2xl border border-[var(--line)] bg-white p-5 text-left transition hover:border-[var(--orange)]/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[var(--muted)]">#{order.id.slice(0, 8)}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{timeAgo(order.created_at)}</p>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: meta.bg, color: meta.color }}>
                      <StatusIcon className="size-3" />
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--ink)]">
                      <User className="size-3.5 text-[var(--muted)]" />
                      <span className="truncate font-semibold">{order.full_name || order.user?.name || "Customer"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <MapPin className="size-3.5" />
                      <span className="truncate">{order.address?.split(",")[0] || "No address"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--orange)]">
                      {getCurrencySymbolForCountry(order.country)}
                      {(order.order_amount || 0).toFixed(2)}
                    </div>
                    {order.driver_id ? (
                      <div className="flex items-center gap-2 text-xs text-[#10B981]">
                        <Truck className="size-3.5" />
                        Driver assigned
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-[#F59E0B]">
                        <AlertCircle className="size-3.5" />
                        No driver assigned
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-1 border-t border-[var(--line)] pt-3 text-xs font-bold text-[var(--orange)]">
                    View details <ChevronRight className="size-3.5" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <OrderDetailsDrawer
          order={selected}
          country={country}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load()
          }}
        />
      )}

      {showNewOrder && (
        <NewOrderModal
          country={country}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => {
            setShowNewOrder(false)
            load()
          }}
        />
      )}
    </main>
  )
}

function OrderDetailsDrawer({
  order,
  country,
  onClose,
  onChanged,
}: {
  order: Order
  country: string
  onClose: () => void
  onChanged: () => void
}) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [updates, setUpdates] = useState<OrderStatusUpdate[]>([])
  const [loadingUpdates, setLoadingUpdates] = useState(true)
  const [drivers, setDrivers] = useState<AvailableDriver[]>([])
  const [assigning, setAssigning] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [current, setCurrent] = useState<Order>(order)

  useEffect(() => {
    setCurrent(order)
  }, [order])

  useEffect(() => {
    setLoadingItems(true)
    ordersService.getOrderItems(order.id).then(({ data }) => {
      setItems(data)
      setLoadingItems(false)
    })
    setLoadingUpdates(true)
    ordersService.getStatusUpdates(order.id).then(({ data }) => {
      setUpdates(data)
      setLoadingUpdates(false)
    })
    ordersService.getAvailableDrivers(country).then(({ data }) => setDrivers(data))
  }, [order.id, country])

  const handleAssign = async (driverId: string) => {
    if (!driverId) return
    setAssigning(true)
    setActionError(null)
    const result = await ordersService.assignDriver(order.id, driverId)
    setAssigning(false)
    if (!result.success) {
      setActionError(result.error || "Could not assign driver.")
      return
    }
    setCurrent((prev) => ({ ...prev, driver_id: driverId, status: "accepted" }))
    onChanged()
  }

  const handleStatusChange = async (status: OrderStatus) => {
    setUpdatingStatus(true)
    setActionError(null)
    const result = await ordersService.updateOrderStatus(order.id, status)
    setUpdatingStatus(false)
    if (!result.success) {
      setActionError(result.error || "Could not update status.")
      return
    }
    setCurrent((prev) => ({ ...prev, status }))
    onChanged()
  }

  const meta = STATUS_META[current.status || "pending"] || STATUS_META.pending
  const symbol = getCurrencySymbolForCountry(current.country || country)

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
          <h2 className="text-lg font-bold">Order #{order.id.slice(0, 8)}</h2>
          <button onClick={onClose} aria-label="Close"><X className="size-5" /></button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ backgroundColor: meta.bg, color: meta.color }}>
              {meta.label}
            </span>
            <span className="rounded-full bg-[#EEF2FF] px-3 py-1.5 text-[11px] font-bold text-[#4338CA]">{current.category || "Uncategorized"}</span>
          </div>

          {actionError && <p className="rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{actionError}</p>}

          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Customer</p>
            <div className="space-y-2 rounded-xl bg-[#f5f7fb] p-4 text-sm">
              <div className="flex items-center gap-2"><User className="size-4 text-[var(--muted)]" />{current.full_name || current.user?.name || "N/A"}</div>
              <div className="flex items-center gap-2"><Phone className="size-4 text-[var(--muted)]" />{current.phone_number || current.user?.phone_number || "N/A"}</div>
              <div className="flex items-center gap-2"><Mail className="size-4 text-[var(--muted)]" />{current.user?.email || "N/A"}</div>
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />{current.address || "N/A"}</div>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Items ordered</p>
            <div className="divide-y divide-[var(--line)] rounded-xl bg-[#f5f7fb]">
              {loadingItems ? (
                <p className="p-4 text-xs text-[var(--muted)]">Loading items…</p>
              ) : items.length === 0 ? (
                <p className="p-4 text-xs italic text-[var(--muted)]">No line items recorded for this order.</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{resolveItemName(item)}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Qty {item.quantity || 1} × {symbol}
                        {resolveItemPrice(item).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--orange)]">
                      {symbol}
                      {(resolveItemPrice(item) * (item.quantity || 1)).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Payment</p>
            <div className="space-y-2 rounded-xl bg-[#f5f7fb] p-4 text-sm">
              <div className="flex justify-between"><span className="text-[var(--muted)]">Method</span><span className="font-semibold">{current.payment_method || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Order amount</span><span className="font-semibold">{symbol}{(current.order_amount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Total</span><span className="font-bold text-[var(--orange)]">{symbol}{(current.total_amount || current.order_amount || 0).toFixed(2)}</span></div>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Driver</p>
            {current.driver_id ? (
              <div className="space-y-2 rounded-xl bg-[#f5f7fb] p-4 text-sm">
                <div className="flex items-center gap-2"><Truck className="size-4 text-[#10B981]" />{[current.driver_name, current.driver_surname].filter(Boolean).join(" ") || "Assigned driver"}</div>
                {(current.car || current.model) && <p className="text-xs text-[var(--muted)]">{[current.car, current.model].filter(Boolean).join(" ")}</p>}
                {current.plate && <p className="text-xs text-[var(--muted)]">Plate: {current.plate}</p>}
              </div>
            ) : (
              <div className="rounded-xl bg-[#f5f7fb] p-4">
                <p className="mb-2 text-xs text-[var(--muted)]">No driver assigned yet — pick one to assign now.</p>
                <select
                  disabled={assigning}
                  defaultValue=""
                  onChange={(e) => handleAssign(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none disabled:opacity-60"
                >
                  <option value="" disabled>
                    {assigning ? "Assigning…" : "Select a driver"}
                  </option>
                  {drivers.map((d) => (
                    <option key={d.user_id} value={d.user_id}>
                      {d.users?.name || "Driver"} {d.is_available ? "· available" : "· offline"}
                    </option>
                  ))}
                </select>
                {drivers.length === 0 && <p className="mt-2 text-[11px] text-[var(--muted)]">No approved drivers found for this country.</p>}
              </div>
            )}
          </section>

          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Timeline</p>
            <div className="divide-y divide-[var(--line)] rounded-xl bg-[#f5f7fb]">
              {[
                ["Placed", current.created_at],
                ["Accepted", current.accepted_at],
                ["Picked Up", current.picked_up_at],
                ["On the Way", current.on_the_way_at],
                ["Arrived", current.arrived_at],
                ["Delivered", current.delivered_at],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="font-semibold">{label}</span>
                  <span className="text-[var(--muted)]">{value ? new Date(value as string).toLocaleString() : "—"}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Delivery updates</p>
            <div className="divide-y divide-[var(--line)] rounded-xl bg-[#f5f7fb]">
              {loadingUpdates ? (
                <p className="p-4 text-xs text-[var(--muted)]">Loading delivery updates…</p>
              ) : updates.length === 0 ? (
                <p className="p-4 text-xs italic text-[var(--muted)]">No delivery updates submitted for this order.</p>
              ) : (
                updates.map((u) => (
                  <div key={u.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{(u.status || "").replace(/_/g, " ").toUpperCase() || "UPDATE"}</span>
                      <span className="text-[11px] text-[var(--muted)]">{u.created_at ? new Date(u.created_at).toLocaleString() : ""}</span>
                    </div>
                    {u.notes && <p className="mt-1 text-xs text-[var(--ink)]">Notes: {u.notes}</p>}
                    {u.odometer_reading && <p className="mt-1 text-xs text-[var(--ink)]">Odometer: {u.odometer_reading}</p>}
                    {u.fuel_level && <p className="mt-1 text-xs text-[var(--ink)]">Fuel level: {u.fuel_level}</p>}
                    {u.issues && <p className="mt-1 text-xs font-semibold text-[#DC2626]">Issue reported: {u.issues}</p>}
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Change status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  disabled={updatingStatus || current.status === s.id}
                  onClick={() => handleStatusChange(s.id)}
                  className={`rounded-xl px-3 py-2 text-[11px] font-bold disabled:opacity-50 ${
                    current.status === s.id ? "bg-[var(--dark)] text-white" : "bg-[#f5f7fb] text-[var(--muted)] hover:bg-[#ebe8df]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
