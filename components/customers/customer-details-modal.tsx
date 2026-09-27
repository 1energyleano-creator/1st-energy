"use client"

import { useEffect, useState } from "react"
import { Calendar, Mail, MapPin, Package, Phone, X } from "lucide-react"
import { customersService, type Customer } from "@/lib/customers-service"

type Props = {
  customer: Customer
  onClose: () => void
}

export function CustomerDetailsModal({ customer, onClose }: Props) {
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    let active = true
    setLoadingOrders(true)
    customersService.getOrderCount(customer.id).then(({ count }) => {
      if (active) {
        setOrderCount(count)
        setLoadingOrders(false)
      }
    })
    return () => {
      active = false
    }
  }, [customer.id])

  const initial = (customer.name || "?").charAt(0).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">Customer details</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center">
          <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-[var(--orange)] text-2xl font-bold text-white">
            {initial}
          </div>
          <p className="text-base font-bold text-[var(--ink)]">{customer.name || "Unnamed customer"}</p>
        </div>

        <div className="divide-y divide-[var(--line)]">
          <DetailRow icon={Mail} label="Email" value={customer.email} />
          <DetailRow
            icon={Phone}
            label="Phone"
            value={customer.phone_number}
            href={customer.phone_number ? `tel:${customer.phone_number}` : undefined}
          />
          <DetailRow icon={MapPin} label="Operating city" value={customer.city || "Not set"} />
          <DetailRow icon={Calendar} label="Joined" value={new Date(customer.created_at).toLocaleDateString()} />
          <DetailRow
            icon={Package}
            label="Total orders"
            value={loadingOrders ? "Loading…" : String(orderCount ?? "—")}
          />
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail
  label: string
  value: string | null
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-3 py-3">
      <Icon className="size-4 text-[var(--muted)]" />
      <span className="flex-1 text-sm text-[var(--muted)]">{label}</span>
      <span className={`max-w-[55%] truncate text-right text-sm font-semibold ${href ? "text-[var(--orange)]" : "text-[var(--ink)]"}`}>
        {value || "—"}
      </span>
    </div>
  )

  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  )
}
