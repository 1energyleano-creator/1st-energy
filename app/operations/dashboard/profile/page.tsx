"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Truck,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react"
import { useAdminSession } from "@/lib/use-admin-session"
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from "@/lib/countries"
import { categoriesService } from "@/lib/categories-service"
import {
  notificationsService,
  DEFAULT_NOTIFICATION_PREFERENCES,
  SOUND_LIBRARY,
  SOUND_MODE_HINTS,
  type Audience,
  type SendMode,
  type FeedSection,
  type Recipient,
  type SoundMode,
  type NotificationTypePref,
  type DefaultUserSound,
} from "@/lib/notifications-service"

type Tab = "profile" | "feed" | "compose" | "sounds"

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "profile", label: "Profile", icon: ShieldCheck },
  { key: "feed", label: "Notification Feed", icon: Bell },
  { key: "compose", label: "Push Composer", icon: Send },
  { key: "sounds", label: "Sound Settings", icon: Volume2 },
]

const CUSTOMER_TEMPLATES = [
  { label: "Promotion", title: "Special Offer!", body: "Enjoy a limited-time discount on your next gas delivery. Order now!" },
  { label: "Service Announcement", title: "Service Update", body: "We've made improvements to our delivery service. Check out what's new!" },
  { label: "Order Received", title: "Order Received", body: "Your order has been received and is being processed." },
  { label: "Driver Arrived", title: "Driver Has Arrived", body: "Your driver has arrived at your location." },
]

const DRIVER_TEMPLATES = [
  { label: "Announcement", title: "Announcement", body: "Please take note of the following update from the team." },
  { label: "Policy Update", title: "Policy Update", body: "We've updated our driver policies. Please review them in the app." },
  { label: "Payout Reminder", title: "Payout Reminder", body: "A reminder that payouts are processed weekly — make sure your details are up to date." },
  { label: "Thank You", title: "Thank You!", body: "Thanks for your hard work this week — keep up the great service!" },
]

const MODES: { id: SoundMode; label: string; icon: any }[] = [
  { id: "in_app", label: "In-App Sound", icon: BellRing },
  { id: "system", label: "System Sound", icon: Bell },
  { id: "off", label: "Silent", icon: VolumeX },
]

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AdminProfilePage() {
  const router = useRouter()
  const { loading: authLoading, admin } = useAdminSession()
  const isMainAdmin = admin?.admin_type !== "sub"
  const [tab, setTab] = useState<Tab>("profile")

  useEffect(() => {
    if (!authLoading && !admin) router.replace("/operations")
  }, [authLoading, admin, router])

  // --- Feed ------------------------------------------------------------
  const [feedLoading, setFeedLoading] = useState(true)
  const [sections, setSections] = useState<FeedSection[]>([])

  const loadFeed = useCallback(async () => {
    if (!admin) return
    setFeedLoading(true)
    const data = await notificationsService.getFeed(isMainAdmin)
    setSections(data)
    setFeedLoading(false)
  }, [admin, isMainAdmin])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const totalFeedCount = sections.reduce((sum, s) => sum + s.data.length, 0)

  // --- Compose -----------------------------------------------------------
  const [country, setCountry] = useState(DEFAULT_COUNTRY_CODE)
  const [audience, setAudience] = useState<Audience>("customers")
  const [mode, setMode] = useState<SendMode>("all")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const templates = audience === "drivers" ? DRIVER_TEMPLATES : CUSTOMER_TEMPLATES
  const audienceLabel = audience === "drivers" ? "driver" : "customer"
  const audienceLabelPlural = audience === "drivers" ? "drivers" : "customers"

  useEffect(() => {
    if (mode !== "selected") return
    setLoadingRecipients(true)
    notificationsService.loadRecipients(audience, country).then(({ data }) => {
      setRecipients(data)
      setLoadingRecipients(false)
    })
  }, [mode, audience, country])

  useEffect(() => {
    if (audience !== "drivers") return
    categoriesService.getAllCategories(country).then(({ data }) => {
      setCategoryOptions((data || []).filter((c) => c.active).map((c) => c.name))
    })
  }, [audience, country])

  const switchAudience = (next: Audience) => {
    if (next === audience) return
    setAudience(next)
    setRecipients([])
    setSelectedIds(new Set())
    setSearch("")
    setSelectedCategory(null)
    if (next === "customers" && mode === "category") setMode("all")
  }

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recipients
    return recipients.filter((r) => r.name?.toLowerCase().includes(q) || r.phone_number?.toLowerCase().includes(q))
  }, [recipients, search])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyTemplate = (tpl: { title: string; body: string }) => {
    setTitle(tpl.title)
    setBody(tpl.body)
  }

  const handleSend = async () => {
    setSendResult(null)
    if (!title.trim() || !body.trim()) {
      setSendResult("error:Please enter both a title and a message.")
      return
    }
    if (mode === "selected" && selectedIds.size === 0) {
      setSendResult(`error:Please select at least one ${audienceLabel}.`)
      return
    }
    if (mode === "category" && !selectedCategory) {
      setSendResult("error:Please select a category to send to.")
      return
    }

    setSending(true)
    try {
      const result =
        mode === "all"
          ? await notificationsService.sendToAll(audience, title.trim(), body.trim(), country)
          : mode === "category"
            ? await notificationsService.sendToDriversByCategory(selectedCategory as string, title.trim(), body.trim(), country)
            : await notificationsService.sendToSelected(audience, Array.from(selectedIds), title.trim(), body.trim())

      if (!result.success) {
        setSendResult(`error:${result.message || "Failed to send notification."}`)
      } else {
        setSendResult(`ok:Delivered to ${result.sentCount ?? 0} recipient${result.sentCount === 1 ? "" : "s"}.`)
        setTitle("")
        setBody("")
        setSelectedIds(new Set())
        setSelectedCategory(null)
      }
    } catch (error) {
      console.error(error)
      setSendResult("error:Something went wrong. Please try again.")
    } finally {
      setSending(false)
    }
  }

  // --- Sound settings ------------------------------------------------------
  const [prefs, setPrefs] = useState<Record<string, NotificationTypePref>>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [defaultUserSound, setDefaultUserSoundState] = useState<DefaultUserSound>({ mode: "in_app", soundId: "sound1" })
  const [soundsLoading, setSoundsLoading] = useState(true)

  useEffect(() => {
    setPrefs(notificationsService.getPrefs())
    notificationsService.getDefaultUserSound().then((d) => {
      setDefaultUserSoundState(d)
      setSoundsLoading(false)
    })
  }, [])

  const setTypeMode = (type: string, m: SoundMode) => {
    const updated = notificationsService.setPrefMode(type, m)
    setPrefs(updated)
    if (m === "in_app") notificationsService.playSound(updated[type].soundId)
  }

  const setTypeSound = (type: string, soundId: string) => {
    const updated = notificationsService.setPrefSound(type, soundId)
    setPrefs(updated)
    notificationsService.playSound(soundId)
  }

  const setDefaultMode = async (m: SoundMode) => {
    const updated = await notificationsService.setDefaultUserSound(m, defaultUserSound.soundId)
    setDefaultUserSoundState(updated)
    if (m === "in_app") notificationsService.playSound(updated.soundId)
  }

  const setDefaultSound = async (soundId: string) => {
    const updated = await notificationsService.setDefaultUserSound(defaultUserSound.mode, soundId)
    setDefaultUserSoundState(updated)
    notificationsService.playSound(soundId)
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

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{admin.name || "Admin account"}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{admin.email}</p>
          </div>
          <span className="rounded-full bg-[#fff0e6] px-3 py-1.5 text-[11px] font-bold text-[#c45c1d]">
            {isMainAdmin ? "Full access" : "Sub-admin"}
          </span>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--line)] pb-4">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                tab === key ? "bg-[var(--dark)] text-white" : "bg-white text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon className="size-4" />
              {label}
              {key === "feed" && totalFeedCount > 0 && (
                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${tab === key ? "bg-white/20" : "bg-[#fff0e6] text-[#c45c1d]"}`}>
                  {totalFeedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <h2 className="text-base font-bold">Account details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#f5f7fb] p-4">
                <p className="text-xs font-semibold text-[var(--muted)]">Name</p>
                <p className="mt-1 text-sm font-semibold">{admin.name || "—"}</p>
              </div>
              <div className="rounded-xl bg-[#f5f7fb] p-4">
                <p className="text-xs font-semibold text-[var(--muted)]">Email</p>
                <p className="mt-1 text-sm font-semibold">{admin.email || "—"}</p>
              </div>
              <div className="rounded-xl bg-[#f5f7fb] p-4">
                <p className="text-xs font-semibold text-[var(--muted)]">Role</p>
                <p className="mt-1 text-sm font-semibold">{isMainAdmin ? "Admin" : "Sub-admin"}</p>
              </div>
              <div className="rounded-xl bg-[#f5f7fb] p-4">
                <p className="text-xs font-semibold text-[var(--muted)]">Account ID</p>
                <p className="mt-1 text-xs font-mono text-[var(--muted)]">{admin.id}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button onClick={() => setTab("feed")} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
                Notification feed <ChevronRight className="size-4" />
              </button>
              <button onClick={() => setTab("compose")} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
                Send a push notification <ChevronRight className="size-4" />
              </button>
              <button onClick={() => setTab("sounds")} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
                Sound settings <ChevronRight className="size-4" />
              </button>
            </div>
          </section>
        )}

        {tab === "feed" && (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Notification feed</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">Everything waiting on you right now, grouped by type.</p>
              </div>
              <button onClick={loadFeed} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
                <RefreshCw className={`size-4 ${feedLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {feedLoading ? (
              <div className="flex items-center justify-center py-16 text-[var(--muted)]">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : sections.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Check className="size-8 text-[#24734a]" />
                <p className="text-sm font-semibold text-[var(--muted)]">You&apos;re all caught up.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sections.map((section) => (
                  <div key={section.key}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange)]">
                      {section.title} {section.data.length > 0 ? `(${section.data.length})` : ""}
                    </p>
                    {section.error && <p className="text-xs font-semibold text-[#a15c00]">{section.error}</p>}
                    <div className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
                      {section.data.map((item) => (
                        <Link key={item.id} href={item.href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[#f5f7fb]">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{item.title}</p>
                            {item.subtitle && <p className="truncate text-xs text-[var(--muted)]">{item.subtitle}</p>}
                          </div>
                          <span className="shrink-0 text-[11px] text-[var(--muted)]">{timeAgo(item.time)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "compose" && (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Push notification composer</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">Sends an in-app + push notification to the audience you pick.</p>
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
            </div>

            <div className="flex gap-2">
              {(["customers", "drivers"] as Audience[]).map((a) => (
                <button
                  key={a}
                  onClick={() => switchAudience(a)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
                    audience === a ? "bg-[var(--orange)] text-white" : "bg-[#f5f7fb] text-[var(--muted)]"
                  }`}
                >
                  {a === "drivers" ? <Truck className="size-4" /> : <Users className="size-4" />}
                  {a === "drivers" ? "Drivers" : "Customers"}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "selected", ...(audience === "drivers" ? ["category" as SendMode] : [])] as SendMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-xl px-3 py-2 text-[11px] font-bold ${mode === m ? "bg-[var(--dark)] text-white" : "bg-[#f5f7fb] text-[var(--muted)]"}`}
                >
                  {m === "all" ? `All ${audienceLabelPlural}` : m === "category" ? "By category" : "Selected"}
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs font-bold text-[var(--muted)]">Quick templates</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.label}
                  onClick={() => applyTemplate(t)}
                  className="rounded-full border border-[var(--orange)]/30 bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--orange)]"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs font-bold text-[var(--muted)]">Title</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="e.g. Weekend Special"
              className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--orange)]"
            />

            <p className="mt-4 text-xs font-bold text-[var(--muted)]">Message</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Write your message…"
              className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--orange)]"
            />

            {mode === "category" && (
              <div className="mt-5">
                <p className="text-xs font-bold text-[var(--muted)]">Select category</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categoryOptions.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`rounded-full px-3.5 py-2 text-xs font-semibold ${
                        selectedCategory === category ? "bg-[var(--orange)] text-white" : "bg-[#f5f7fb] text-[var(--muted)]"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  {categoryOptions.length === 0 && <p className="text-xs text-[var(--muted)]">No categories set up for this country.</p>}
                </div>
              </div>
            )}

            {mode === "selected" && (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[var(--muted)]">Recipients ({selectedIds.size} selected)</p>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedIds(new Set(filteredRecipients.map((r) => r.id)))} className="text-[11px] font-bold text-[var(--orange)]">
                      Select all
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-[11px] font-bold text-[var(--orange)]">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${audienceLabelPlural} by name or phone`}
                    className="h-10 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)]"
                  />
                </div>
                {loadingRecipients ? (
                  <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-[var(--muted)]" /></div>
                ) : (
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                    {filteredRecipients.map((r) => {
                      const checked = selectedIds.has(r.id)
                      return (
                        <button
                          key={r.id}
                          onClick={() => toggleSelect(r.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                            checked ? "border-[var(--orange)] bg-[#fff4ec]" : "border-[var(--line)] bg-white"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold">{r.name || (audience === "drivers" ? "Driver" : "Customer")}</p>
                            {r.phone_number && <p className="text-xs text-[var(--muted)]">{r.phone_number}</p>}
                          </div>
                          <span className={`flex size-5 items-center justify-center rounded-md border ${checked ? "border-[var(--orange)] bg-[var(--orange)] text-white" : "border-[var(--line)]"}`}>
                            {checked && <Check className="size-3.5" />}
                          </span>
                        </button>
                      )
                    })}
                    {filteredRecipients.length === 0 && <p className="py-6 text-center text-xs text-[var(--muted)]">No {audienceLabelPlural} found.</p>}
                  </div>
                )}
              </div>
            )}

            {sendResult && (
              <p className={`mt-5 rounded-xl px-3 py-2 text-xs font-semibold ${sendResult.startsWith("ok:") ? "bg-[#e9f7ef] text-[#24734a]" : "bg-[#fff4e5] text-[#a15c00]"}`}>
                {sendResult.split(":").slice(1).join(":")}
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={sending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {mode === "all"
                ? `Send to all ${audienceLabelPlural}`
                : mode === "category"
                  ? "Send to category"
                  : `Send to ${selectedIds.size} selected`}
            </button>
          </section>
        )}

        {tab === "sounds" && (
          <section className="space-y-4">
            {soundsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-[var(--muted)]" /></div>
            ) : (
              <>
                <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
                  <h2 className="text-sm font-bold">Default for Drivers &amp; Customers</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Every driver and customer follows this unless they pick their own sound in the app.
                  </p>
                  <div className="mt-4 flex gap-2">
                    {MODES.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setDefaultMode(id)}
                        className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-[11px] font-bold ${
                          defaultUserSound.mode === id ? "bg-[var(--orange)] text-white" : "bg-[#f5f7fb] text-[var(--muted)]"
                        }`}
                      >
                        <Icon className="size-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-[var(--muted)]">{SOUND_MODE_HINTS[defaultUserSound.mode]}</p>
                  {defaultUserSound.mode === "in_app" && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                      {SOUND_LIBRARY.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setDefaultSound(s.id)}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                            (defaultUserSound.soundId || "sound1") === s.id ? "bg-[var(--orange)] text-white" : "bg-[#f5f7fb] text-[var(--muted)]"
                          }`}
                        >
                          <Volume2 className="size-3.5" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {Object.entries(prefs).map(([type, pref]) => (
                  <div key={type} className="rounded-2xl border border-[var(--line)] bg-white p-6">
                    <h3 className="text-sm font-bold">{pref.label}</h3>
                    <div className="mt-4 flex gap-2">
                      {MODES.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => setTypeMode(type, id)}
                          className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-[11px] font-bold ${
                            pref.mode === id ? "bg-[var(--orange)] text-white" : "bg-[#f5f7fb] text-[var(--muted)]"
                          }`}
                        >
                          <Icon className="size-5" />
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-[var(--muted)]">{SOUND_MODE_HINTS[pref.mode]}</p>
                    {pref.mode === "in_app" && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                        {SOUND_LIBRARY.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setTypeSound(type, s.id)}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                              (pref.soundId || "sound1") === s.id ? "bg-[var(--orange)] text-white" : "bg-[#f5f7fb] text-[var(--muted)]"
                            }`}
                          >
                            <Volume2 className="size-3.5" />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
