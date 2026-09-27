"use client"

import { useEffect, useState } from "react"
import {
  Ban,
  Car,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  PlayCircle,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import { driversService, isDriverTrulyActive, type Driver } from "@/lib/drivers-service"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import { categoriesService, type Category } from "@/lib/categories-service"
import { locationsService, type LocationRow } from "@/lib/locations-service"

type Props = {
  driver: Driver
  adminId: string | null
  onClose: () => void
  onChanged: () => void
  // Optional lighter-weight update used for edits that shouldn't close
  // the modal (category/country/city) — patches just this driver's row
  // in the parent list so it stays in sync without a full reload.
  onDriverPatched?: (userId: string, patch: Partial<Driver>) => void
}

const DOCUMENTS: { key: keyof Driver; label: string }[] = [
  { key: "license_front_image", label: "License (front)" },
  { key: "license_back_image", label: "License (back)" },
  { key: "vehicle_front_image", label: "Vehicle (front)" },
  { key: "vehicle_back_image", label: "Vehicle (back)" },
  { key: "vehicle_side_image", label: "Vehicle (side)" },
  { key: "ba_permit_image", label: "BA permit" },
  { key: "hazardous_permit_image", label: "Hazardous permit" },
]

export function DriverDetailsModal({ driver: initialDriver, adminId, onClose, onChanged, onDriverPatched }: Props) {
  // Local, optimistically-updated copy of the driver so category/country/
  // city edits reflect instantly without forcing the whole modal to close
  // (approve/reject/delete still go through onChanged, which does close it).
  const [driver, setDriver] = useState<Driver>(initialDriver)
  const [working, setWorking] = useState<null | "approve" | "reject" | "toggle" | "delete">(null)
  const [error, setError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const [categoryOptions, setCategoryOptions] = useState<Category[]>([])
  const [savingCategory, setSavingCategory] = useState<string | null>(null)

  const [savingCountry, setSavingCountry] = useState(false)
  const [cityOptions, setCityOptions] = useState<LocationRow[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [savingCity, setSavingCity] = useState(false)

  function patch(update: Partial<Driver>) {
    setDriver((current) => ({ ...current, ...update }))
    onDriverPatched?.(initialDriver.user_id, update)
  }

  // Live category list for the driver's own country — same list the
  // mobile app's picker offers, so admin can only assign categories that
  // actually exist for that country.
  useEffect(() => {
    let cancelled = false
    if (!driver.country) {
      setCategoryOptions([])
      return
    }
    categoriesService.getAllCategories(driver.country).then(({ data }) => {
      if (!cancelled) setCategoryOptions(data.filter((c) => c.active))
    })
    return () => {
      cancelled = true
    }
  }, [driver.country])

  // Valid city/town/village list for whichever country the driver is
  // currently in — admin can only ever set a city that's an actual
  // operating area, same guard the mobile app applies.
  useEffect(() => {
    let cancelled = false
    if (!driver.country) {
      setCityOptions([])
      return
    }
    setLoadingCities(true)
    locationsService.getAllLocations(driver.country).then(({ data }) => {
      if (!cancelled) {
        setCityOptions(data.filter((l) => l.active))
        setLoadingCities(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [driver.country])

  const symbol = getCurrencySymbolForCountry(driver.country)
  const truelyActive = isDriverTrulyActive(driver)
  const status = driver.verification_status || "pending"

  async function handleCountryChange(countryCode: string) {
    if (countryCode === driver.country) return
    const previous = driver.country
    patch({ country: countryCode, city: null })
    setSavingCountry(true)
    const { error } = await driversService.updateDriverCountry(driver.user_id, countryCode)
    setSavingCountry(false)
    if (error) {
      setError(error)
      patch({ country: previous })
    }
  }

  async function handleCityChange(cityName: string) {
    if (!cityName || cityName === driver.city) return
    const previous = driver.city
    patch({ city: cityName })
    setSavingCity(true)
    const { error } = await driversService.updateDriverCity(driver.user_id, cityName)
    setSavingCity(false)
    if (error) {
      setError(error)
      patch({ city: previous })
    }
  }

  async function handleToggleCategory(categoryName: string) {
    const current = driver.categories || []
    const next = current.includes(categoryName)
      ? current.filter((c) => c !== categoryName)
      : [...current, categoryName]

    patch({ categories: next })
    setSavingCategory(categoryName)
    const { error } = await driversService.updateDriverCategories(driver.user_id, next)
    setSavingCategory(null)
    if (error) {
      setError(error)
      patch({ categories: current })
    }
  }

  async function handleApprove() {
    setWorking("approve")
    setError(null)
    const { error } = await driversService.approveDriver(driver.user_id, adminId)
    setWorking(null)
    if (error) return setError(error)
    onChanged()
  }

  async function handleConfirmReject() {
    if (!rejectReason.trim()) {
      setError("Let the driver know why so they can fix it.")
      return
    }
    setWorking("reject")
    setError(null)
    const { error } = await driversService.rejectDriver(driver.user_id, rejectReason.trim(), adminId)
    setWorking(null)
    if (error) return setError(error)
    setRejecting(false)
    onChanged()
  }

  async function handleToggleAvailability() {
    setWorking("toggle")
    setError(null)
    const { error } = await driversService.setAvailability(
      driver.user_id,
      !driver.is_available,
      driver.verification_status,
      adminId,
    )
    setWorking(null)
    if (error) return setError(error)
    onChanged()
  }

  async function handleDelete() {
    if (!confirm(`Delete ${driver.users?.name || "this driver"}? This cannot be undone.`)) return
    setWorking("delete")
    setError(null)
    const { error } = await driversService.deleteDriver(driver.user_id)
    setWorking(null)
    if (error) return setError(error)
    onClose()
    onChanged()
  }

  const availableDocs = DOCUMENTS.filter((doc) => driver[doc.key])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">Driver details</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-4">
          <div className="relative">
            <div className="flex size-16 items-center justify-center rounded-full bg-[var(--orange)] text-2xl font-bold text-white">
              {(driver.users?.name || "?").charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute -right-0.5 -top-0.5 size-4 rounded-full border-2 border-white ${
                truelyActive ? "bg-[#10B981]" : "bg-[#94A3B8]"
              }`}
            />
          </div>
          <div>
            <p className="text-base font-bold text-[var(--ink)]">{driver.users?.name || "Unnamed driver"}</p>
            <p className="text-xs text-[var(--muted)]">{truelyActive ? "Active now" : "Inactive"}</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 text-xs">
          {driver.users?.email && (
            <span className="flex items-center gap-2 text-[var(--muted)]">
              <Mail className="size-3.5" /> {driver.users.email}
            </span>
          )}
          {driver.users?.phone_number && (
            <span className="flex items-center gap-2 text-[var(--muted)]">
              <Phone className="size-3.5" /> {driver.users.phone_number}
            </span>
          )}
          {driver.city && (
            <span className="flex items-center gap-2 text-[var(--muted)]">
              <MapPin className="size-3.5" /> {driver.city}
            </span>
          )}
          <span className="flex items-center gap-2 text-[var(--muted)]">
            <Car className="size-3.5" /> {driver.vehicle_type || "No vehicle"}
            {driver.vehicle_registration ? ` · ${driver.vehicle_registration}` : ""}
          </span>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#fafaf7] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Total trips</p>
            <p className="mt-1 text-lg font-semibold">{driver.total_trips || 0}</p>
          </div>
          <div className="rounded-xl bg-[#fafaf7] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Total earnings</p>
            <p className="mt-1 text-lg font-semibold">
              {symbol}
              {Number(driver.total_earnings || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Verification</p>
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${
              status === "approved"
                ? "bg-[#e7f7ef] text-[#10B981]"
                : status === "rejected"
                  ? "bg-[#fdeceb] text-[#e0553f]"
                  : "bg-[#fef3e2] text-[#a15c00]"
            }`}
          >
            {status === "approved" ? (
              <CheckCircle2 className="size-4" />
            ) : status === "rejected" ? (
              <XCircle className="size-4" />
            ) : (
              <Clock className="size-4" />
            )}
            {status === "approved"
              ? "Approved — can accept orders"
              : status === "rejected"
                ? "Rejected — cannot accept orders"
                : "Pending review — cannot accept orders yet"}
          </div>

          {status === "rejected" && driver.rejection_reason && (
            <p className="mt-2 text-xs text-[var(--muted)]">Reason given: {driver.rejection_reason}</p>
          )}

          {error && <p className="mt-2 text-xs font-semibold text-[#e0553f]">{error}</p>}

          {status !== "approved" && !rejecting && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleApprove}
                disabled={working !== null}
                className="flex-1 rounded-xl bg-[#10B981] py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {working === "approve" ? "Approving…" : "Approve"}
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={working !== null}
                className="flex-1 rounded-xl bg-[#fdeceb] py-2.5 text-xs font-bold text-[#e0553f] disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          )}

          {rejecting && (
            <div className="mt-3 space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                rows={3}
                className="w-full rounded-xl border border-[var(--line)] p-3 text-xs outline-none focus:border-[var(--orange)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmReject}
                  disabled={working !== null}
                  className="flex-1 rounded-xl bg-[#e0553f] py-2.5 text-xs font-bold text-white disabled:opacity-60"
                >
                  {working === "reject" ? "Rejecting…" : "Confirm reject"}
                </button>
                <button
                  onClick={() => setRejecting(false)}
                  className="flex-1 rounded-xl bg-[#f5f5f5] py-2.5 text-xs font-bold text-[var(--ink)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              Country {savingCountry && <Loader2 className="size-3 animate-spin" />}
            </p>
            <select
              value={driver.country || ""}
              onChange={(e) => handleCountryChange(e.target.value)}
              disabled={savingCountry}
              className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-2.5 text-xs font-semibold outline-none focus:border-[var(--orange)] disabled:opacity-60"
            >
              {!driver.country && <option value="">Not set</option>}
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              City {(savingCity || loadingCities) && <Loader2 className="size-3 animate-spin" />}
            </p>
            <select
              value={driver.city || ""}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={savingCity || loadingCities || !driver.country}
              className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-2.5 text-xs font-semibold outline-none focus:border-[var(--orange)] disabled:opacity-60"
            >
              <option value="">{driver.city || "Not set"}</option>
              {cityOptions
                .filter((l) => l.name !== driver.city)
                .map((l) => (
                  <option key={l.id} value={l.name}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mb-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
            Delivery categories {savingCategory && <Loader2 className="size-3 animate-spin" />}
          </p>
          {(!driver.categories || driver.categories.length === 0) && (
            <p className="mb-2 text-xs text-[var(--muted)]">
              No categories set — this driver currently sees orders of every category.
            </p>
          )}
          {categoryOptions.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No categories set up for this country yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => {
                const isSelected = (driver.categories || []).includes(category.name)
                return (
                  <button
                    key={category.id}
                    onClick={() => handleToggleCategory(category.name)}
                    disabled={savingCategory !== null}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                      isSelected ? "bg-[var(--orange)] text-white" : "bg-[#f5f5f5] text-[var(--muted)]"
                    }`}
                  >
                    {category.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {availableDocs.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Documents</p>
            <div className="grid grid-cols-3 gap-2">
              {availableDocs.map((doc) => (
                <a
                  key={String(doc.key)}
                  href={String(driver[doc.key])}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-[var(--line)]"
                >
                  <img src={String(driver[doc.key])} alt={doc.label} className="aspect-square w-full object-cover" />
                  <p className="truncate p-1 text-center text-[10px] text-[var(--muted)]">{doc.label}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 border-t border-[var(--line)] pt-4">
          <button
            onClick={handleToggleAvailability}
            disabled={working !== null}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold disabled:opacity-60 ${
              driver.is_available ? "bg-[#fdeceb] text-[#e0553f]" : "bg-[#e7f7ef] text-[#10B981]"
            }`}
          >
            {driver.is_available ? <Ban className="size-3.5" /> : <PlayCircle className="size-3.5" />}
            {working === "toggle" ? "Updating…" : driver.is_available ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={handleDelete}
            disabled={working !== null}
            aria-label="Delete driver"
            className="flex items-center justify-center rounded-xl bg-[#fdeceb] px-4 text-[#e0553f] disabled:opacity-60"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
