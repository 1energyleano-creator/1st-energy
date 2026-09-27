"use client"

import "leaflet/dist/leaflet.css"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Car, Clock, MapPin, Phone, RefreshCw, Search, User, X } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES } from "@/lib/countries"
import {
  liveDriversMapService,
  isLocationStale,
  statusOf,
  timeAgo,
  formatElapsed,
  STATUS_META,
  CUSTOMER_PIN_COLOR,
  REFRESH_INTERVAL_MS,
  type LiveDriver,
  type CustomerPin,
} from "@/lib/live-drivers-map-service"

// Fallback map center when there are no located drivers yet — roughly
// central Botswana, same fallback the mobile app's map uses.
const FALLBACK_CENTER: [number, number] = [-24.6282, 25.9231]

function driverIconHtml(color: string) {
  return `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px;">🚚</div>`
}

function customerIconHtml() {
  return `<div style="width:26px;height:26px;border-radius:50%;background:${CUSTOMER_PIN_COLOR};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:13px;">👤</div>`
}

export default function LiveDriversMapPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [drivers, setDrivers] = useState<LiveDriver[]>([])
  const [onDeliveryIds, setOnDeliveryIds] = useState<Set<string>>(new Set())
  const [customerByDriverId, setCustomerByDriverId] = useState<Map<string, CustomerPin>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedDriver, setSelectedDriver] = useState<LiveDriver | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPin | null>(null)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const hasCenteredRef = useRef(false)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async (country_: string, { silent }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true)
    const result = await liveDriversMapService.getLiveDrivers(country_)
    setDrivers(result.drivers)
    setOnDeliveryIds(result.onDeliveryIds)
    setCustomerByDriverId(result.customerByDriverId)
    setError(result.error)
    setLoading(false)
  }, [])

  // Reload on country switch and poll on an interval while this page is
  // open — matches the mobile app's map, which has no realtime
  // subscription on driver_profiles.last_location.
  useEffect(() => {
    if (!admin) return
    hasCenteredRef.current = false
    load(country)
    const interval = setInterval(() => load(country, { silent: true }), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [admin, country, load])

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers
    const q = search.trim().toLowerCase()
    return drivers.filter((d) => d.users?.name?.toLowerCase().includes(q))
  }, [drivers, search])

  // Set up the Leaflet map once, client-side only.
  useEffect(() => {
    let cancelled = false
    import("leaflet").then((mod) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return
      const L = mod.default ?? mod
      leafletRef.current = L
      const map = L.map(mapContainerRef.current, {
        center: FALLBACK_CENTER,
        zoom: 5,
      })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)
      markersLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
    })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
  }, [])

  // Redraw pins + connectors whenever the data or filter changes.
  useEffect(() => {
    const L = leafletRef.current
    const layer = markersLayerRef.current
    if (!L || !layer) return
    layer.clearLayers()

    const onDelivery = filteredDrivers.filter((d) => onDeliveryIds.has(d.user_id) && customerByDriverId.has(d.user_id))

    for (const driver of onDelivery) {
      if (!driver.last_location) continue
      const customer = customerByDriverId.get(driver.user_id)
      if (!customer) continue
      L.polyline(
        [
          [driver.last_location.latitude, driver.last_location.longitude],
          [customer.latitude, customer.longitude],
        ],
        { color: CUSTOMER_PIN_COLOR, weight: 2, dashArray: "3,6" },
      ).addTo(layer)
    }

    for (const driver of filteredDrivers) {
      if (!driver.last_location) continue
      const status = statusOf(driver, onDeliveryIds)
      const icon = L.divIcon({ className: "", html: driverIconHtml(STATUS_META[status].color), iconSize: [28, 28], iconAnchor: [14, 14] })
      const marker = L.marker([driver.last_location.latitude, driver.last_location.longitude], { icon })
      marker.on("click", () => {
        setSelectedCustomer(null)
        setSelectedDriver(driver)
      })
      marker.addTo(layer)
    }

    for (const driver of onDelivery) {
      const customer = customerByDriverId.get(driver.user_id)
      if (!customer) continue
      const icon = L.divIcon({ className: "", html: customerIconHtml(), iconSize: [26, 26], iconAnchor: [13, 13] })
      const marker = L.marker([customer.latitude, customer.longitude], { icon })
      marker.on("click", () => {
        setSelectedDriver(null)
        setSelectedCustomer(customer)
      })
      marker.addTo(layer)
    }
  }, [filteredDrivers, onDeliveryIds, customerByDriverId])

  // Center the map on the fleet the first time this country's drivers
  // load with at least one located driver — after that, leave the
  // camera alone so a poll doesn't yank the admin's view around.
  useEffect(() => {
    const map = mapRef.current
    if (!map || hasCenteredRef.current || drivers.length === 0) return
    const first = drivers[0]
    if (!first.last_location) return
    map.setView([first.last_location.latitude, first.last_location.longitude], 11, { animate: false })
    hasCenteredRef.current = true
  }, [drivers])

  function focusOnDriver(driver: LiveDriver) {
    setSelectedCustomer(null)
    setSelectedDriver(driver)
    setSearch("")
    if (mapRef.current && driver.last_location) {
      mapRef.current.flyTo([driver.last_location.latitude, driver.last_location.longitude], 14, { duration: 0.6 })
    }
  }

  if (authLoading || !admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--cream)] text-[var(--muted)]">
        <p className="text-sm">Checking your access…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[var(--cream)] text-[var(--ink)]">
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-[var(--line)] px-5 sm:px-8">
        <Link
          href="/operations/dashboard/drivers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to drivers
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-white px-5 py-4 sm:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.03em]">Live drivers map</h1>
          <p className="text-xs text-[var(--muted)]">Positions refresh automatically every 20 seconds.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver by name…"
              className="h-10 w-56 rounded-xl border border-[var(--line)] bg-white pl-9 pr-8 text-xs outline-none focus:border-[var(--orange)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold outline-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => load(country)}
            className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {search.trim() && (
        <div className="border-b border-[var(--line)] bg-white px-5 py-2 sm:px-8">
          {filteredDrivers.length === 0 ? (
            <p className="py-2 text-xs text-[var(--muted)]">No matching drivers found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredDrivers.slice(0, 8).map((driver) => (
                <button
                  key={driver.user_id}
                  onClick={() => focusOnDriver(driver)}
                  className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[#fafaf7] px-3 py-1.5 text-xs font-semibold"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: STATUS_META[statusOf(driver, onDeliveryIds)].color }}
                  />
                  {driver.users?.name || "Unnamed driver"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 border-b border-[var(--line)] bg-white px-5 py-2.5 text-xs text-[var(--muted)] sm:px-8">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: CUSTOMER_PIN_COLOR }} />
          Customer
        </span>
        <span className="ml-auto font-semibold">{drivers.length} shown</span>
      </div>

      {error && (
        <p className="border-b border-[var(--line)] bg-[#fff4e5] px-5 py-2 text-xs font-semibold text-[#a15c00] sm:px-8">
          {error}
        </p>
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={mapContainerRef} className="absolute inset-0" />

        {loading && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[var(--cream)]/70">
            <p className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] shadow">
              Loading drivers…
            </p>
          </div>
        )}

        {!loading && drivers.length === 0 && (
          <div className="absolute left-1/2 top-1/2 z-[500] w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 text-center shadow-lg">
            <MapPin className="mx-auto mb-2 size-6 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--ink)]">No located drivers</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              No active drivers with a known location for this country yet. Drivers need to have opened the app at
              least once with location enabled.
            </p>
          </div>
        )}

        {selectedDriver && (
          <div className="absolute bottom-4 left-1/2 z-[500] w-[min(92vw,380px)] -translate-x-1/2 rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-2 flex items-center gap-2.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_META[statusOf(selectedDriver, onDeliveryIds)].color }}
              />
              <p className="flex-1 truncate text-sm font-bold">{selectedDriver.users?.name || "Unnamed driver"}</p>
              <button onClick={() => setSelectedDriver(null)} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-[var(--muted)]">
              {selectedDriver.is_available && !isLocationStale(selectedDriver) ? "Online" : "Offline"} ·{" "}
              {STATUS_META[statusOf(selectedDriver, onDeliveryIds)].label}
            </p>

            <div className="space-y-2 text-xs text-[var(--ink)]">
              <p className="flex items-center gap-2">
                <Car className="size-3.5 text-[var(--muted)]" />
                {selectedDriver.vehicle_type || "No vehicle on file"}
                {selectedDriver.vehicle_registration ? ` · ${selectedDriver.vehicle_registration}` : ""}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-3.5 text-[var(--muted)]" />
                {selectedDriver.city || "No city on file"}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-3.5 text-[var(--muted)]" />
                {selectedDriver.users?.phone_number || "No phone on file"}
              </p>
              {statusOf(selectedDriver, onDeliveryIds) === "on_delivery" &&
                (() => {
                  const customer = customerByDriverId.get(selectedDriver.user_id)
                  const elapsed = customer ? formatElapsed(customer.acceptedAt) : null
                  return elapsed ? (
                    <p className="flex items-center gap-2">
                      <Clock className="size-3.5 text-[var(--muted)]" />
                      On this delivery: {elapsed}
                    </p>
                  ) : null
                })()}
            </div>

            {(!selectedDriver.is_available || isLocationStale(selectedDriver)) && (
              <p className="mt-3 rounded-xl bg-[#fef3c7] px-3 py-2 text-[11px] leading-4 text-[#92400e]">
                {!selectedDriver.is_available
                  ? `Toggled offline in the app — last seen ${timeAgo(selectedDriver.location_updated_at)}.`
                  : `Still marked online, but their location hasn't updated in ${timeAgo(
                      selectedDriver.location_updated_at,
                    )} — likely phone location/GPS is off. This pin shows their last known position, not a live one.`}
              </p>
            )}
          </div>
        )}

        {selectedCustomer && (
          <div className="absolute bottom-4 left-1/2 z-[500] w-[min(92vw,380px)] -translate-x-1/2 rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-2 flex items-center gap-2.5">
              <User className="size-4" style={{ color: CUSTOMER_PIN_COLOR }} />
              <p className="flex-1 truncate text-sm font-bold">{selectedCustomer.customerName}</p>
              <button
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close"
                className="text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-[var(--muted)]">Customer · Delivery in progress</p>
            {selectedCustomer.address && (
              <p className="flex items-center gap-2 text-xs text-[var(--ink)]">
                <MapPin className="size-3.5 text-[var(--muted)]" />
                {selectedCustomer.address}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
