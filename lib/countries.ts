// Ported from the mobile app's config/countries.js so the admin website
// renders the same country labels and currency symbols the drivers see.

export type Country = {
  code: string
  currency: string
  name: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { code: "BW", currency: "BWP", name: "Botswana", flag: "🇧🇼" },
  { code: "SZ", currency: "SZL", name: "Eswatini", flag: "🇸🇿" },
  { code: "ZA", currency: "ZAR", name: "South Africa", flag: "🇿🇦" },
  { code: "ZM", currency: "ZMW", name: "Zambia", flag: "🇿🇲" },
  { code: "NA", currency: "NAD", name: "Namibia", flag: "🇳🇦" },
  { code: "ZW", currency: "USD", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "MZ", currency: "MZN", name: "Mozambique", flag: "🇲🇿" },
]

export const DEFAULT_COUNTRY_CODE = "BW"

export const CURRENCY_SYMBOLS: Record<string, string> = {
  BWP: "P",
  SZL: "E",
  ZAR: "R",
  ZMW: "K",
  NAD: "N$",
  USD: "$",
  MZN: "MT",
}

export const getCountry = (code?: string | null): Country =>
  COUNTRIES.find((c) => c.code === String(code)) ||
  (COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE) as Country)

export const getCurrencyForCountry = (code?: string | null) => getCountry(code).currency

export const getCurrencySymbolForCountry = (code?: string | null) =>
  CURRENCY_SYMBOLS[getCurrencyForCountry(code)] || ""
