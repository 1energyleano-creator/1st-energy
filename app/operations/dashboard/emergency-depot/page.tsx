"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Crosshair, MapPin } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES } from "@/lib/countries"
import { emergencyDepotService } from "@/lib/emergency-depot-service"

export default function EmergencyDepotPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const countryName = COUNTRIES.find((c) => c.code === country)?.name || country

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    setSaved(false)
    const { data, error } = await emergencyDepotService.getDepot(country)
    setLatitude(data ? String(data.latitude) : "")
    setLongitude(data ? String(data.longitude) : "")
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("This browser does not support location. Enter coordinates manually.")
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude))
        setLongitude(String(position.coords.longitude))
        setLocating(false)
      },
      () => {
        setError("Could not get your current location. Enter coordinates manually.")
        setLocating(false)
      },
    )
  }

  async function handleSave() {
    const lat = Number.parseFloat(latitude)
    const lng = Number.parseFloat(longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Please enter valid latitude and longitude values.")
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)
    const { error } = await emergencyDepotService.setDepot(country, lat, lng)
    setSaving(false)
    if (error) return setError(error)
    setSaved(true)
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
        <Link href="/operations/dashboard/fuel-products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to fuel products
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Emergency delivery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Emergency Fuel Depot</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {countryName} — the point emergency fuel delivery distance is measured from. First 10km is a flat
              P{35} call-out fee. Every km after that adds P{3.5}/km.
            </p>
          </div>
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
        </div>

        {error && <p className="mb-4 rounded-xl bg-[#fff4e5] px-3 py-2 text-xs font-semibold text-[#a15c00]">{error}</p>}
        {saved && (
          <p className="mb-4 rounded-xl bg-[#eafaf0] px-3 py-2 text-xs font-semibold text-[#24734a]">
            Emergency fuel depot for {countryName} has been updated.
          </p>
        )}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
            Loading depot location…
          </p>
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <div className="mb-4 flex items-center gap-2 text-[var(--orange)]">
              <MapPin className="size-5" />
              <span className="text-xs font-bold uppercase tracking-[0.15em]">Depot coordinates</span>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Latitude</span>
              <input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. -24.643573"
                inputMode="decimal"
                className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Longitude</span>
              <input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 25.924011"
                inputMode="decimal"
                className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--orange)]"
              />
            </label>

            <button
              onClick={handleUseMyLocation}
              disabled={locating}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--orange)] py-3 text-sm font-bold text-[var(--orange)] disabled:opacity-60"
            >
              <Crosshair className="size-4" />
              {locating ? "Locating…" : "Use my current location"}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-[var(--dark)] py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save depot location"}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
