"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calculator } from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, getCurrencySymbolForCountry } from "@/lib/countries"
import { deliveryFeeService, type DeliveryRate } from "@/lib/delivery-fee-service"

const PREVIEW_DISTANCES = [5, 10, 15, 25]

export default function DeliveryFeesPage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()

  const [country, setCountry] = useState(COUNTRIES[0].code)
  const [savedRate, setSavedRate] = useState<DeliveryRate | null>(null)
  const [baseFeeInput, setBaseFeeInput] = useState("35")
  const [includedKmInput, setIncludedKmInput] = useState("10")
  const [perKmInput, setPerKmInput] = useState("3.5")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  const load = useCallback(async () => {
    setLoading(true)
    setSaved(false)
    const { data, error } = await deliveryFeeService.getRate(country)
    setSavedRate(data)
    setBaseFeeInput(String(data.base_fee))
    setIncludedKmInput(String(data.included_km))
    setPerKmInput(String(data.per_km_fee))
    setError(error)
    setLoading(false)
  }, [country])

  useEffect(() => {
    if (!admin) return
    load()
  }, [admin, load])

  const isDirty =
    !!savedRate &&
    (Number(baseFeeInput) !== savedRate.base_fee ||
      Number(includedKmInput) !== savedRate.included_km ||
      Number(perKmInput) !== savedRate.per_km_fee)

  async function handleSave() {
    const base_fee = Number(baseFeeInput)
    const included_km = Number(includedKmInput)
    const per_km_fee = Number(perKmInput)

    if ([base_fee, included_km, per_km_fee].some((n) => Number.isNaN(n) || n < 0)) {
      setError("Please enter valid, non-negative numbers for all three fields.")
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)
    const { data, error } = await deliveryFeeService.setRate(country, { base_fee, included_km, per_km_fee })
    setSaving(false)
    if (error) return setError(error)
    setSavedRate(data)
    setSaved(true)
  }

  function previewFee(distanceKm: number) {
    const base = Number(baseFeeInput) || 0
    const included = Number(includedKmInput) || 0
    const perKm = Number(perKmInput) || 0
    if (distanceKm <= included) return base
    return base + (distanceKm - included) * perKm
  }

  const symbol = getCurrencySymbolForCountry(country)

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
        <Link href="/operations/dashboard/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--orange)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to products
        </Link>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">
          {(admin.name || "AD").slice(0, 2).toUpperCase()}
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Pricing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Delivery Pricing</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Distance-based delivery fee for Accessories or Appliances orders, calculated between the customer and
              whichever driver accepts — set once per country here. Fuel and gas are priced separately under
              Emergency Prices/Depot and never use this fee.
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
            Delivery pricing for {country} has been updated.
          </p>
        )}

        {loading ? (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-16 text-center text-sm text-[var(--muted)]">
            Loading delivery pricing…
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Base fee</span>
                  <div className="flex h-11 items-center rounded-xl border border-[var(--line)] bg-[#fafafa] px-3">
                    <span className="mr-1 text-sm text-[var(--muted)]">{symbol}</span>
                    <input
                      value={baseFeeInput}
                      onChange={(e) => setBaseFeeInput(e.target.value)}
                      inputMode="decimal"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--muted)]">Flat fee for the first stretch of distance</p>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Covers up to</span>
                  <div className="flex h-11 items-center rounded-xl border border-[var(--line)] bg-[#fafafa] px-3">
                    <input
                      value={includedKmInput}
                      onChange={(e) => setIncludedKmInput(e.target.value)}
                      inputMode="decimal"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                    <span className="ml-1 text-sm text-[var(--muted)]">km</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--muted)]">Distance included in the base fee</p>
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Then, per extra km</span>
                  <div className="flex h-11 items-center rounded-xl border border-[var(--line)] bg-[#fafafa] px-3 sm:w-1/2">
                    <span className="mr-1 text-sm text-[var(--muted)]">{symbol}</span>
                    <input
                      value={perKmInput}
                      onChange={(e) => setPerKmInput(e.target.value)}
                      inputMode="decimal"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--muted)]">Charged for every km beyond the included distance</p>
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="mt-6 w-full rounded-xl bg-[var(--dark)] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : `Save changes for ${country}`}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-[var(--muted)]">
                <Calculator className="size-4" />
                <span className="text-xs font-bold uppercase tracking-[0.15em]">Preview</span>
              </div>
              {PREVIEW_DISTANCES.map((km) => (
                <div key={km} className="flex items-center justify-between border-t border-[#f0f0f0] py-2.5 text-sm first:border-0">
                  <span className="text-[var(--muted)]">{km} km trip</span>
                  <span className="font-bold">
                    {symbol}
                    {previewFee(km).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
