'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, BarChart3, Bell, Car, ChevronRight, ClipboardList, GalleryHorizontal, LandmarkIcon, LayoutDashboard, LogOut, MapPinned, Menu, MessageCircle, Package, Settings, ShieldCheck, Truck, UserCircle, Users, Wallet, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CountryStatsGrid } from '@/components/country-stats-grid'

const permissionOptions = ['Deliveries', 'Requests', 'Customers'] as const

type Permission = (typeof permissionOptions)[number]

type TeamMember = {
  name: string
  email: string
  role: 'Admin' | 'Sub-admin'
  permissions: Permission[]
  initials: string
}

const initialTeam: TeamMember[] = [
  { name: 'Admin account', email: 'admin@1stenergy.com', role: 'Admin', permissions: [...permissionOptions], initials: 'AD' },
  { name: 'Mpho Dlamini', email: 'mpho@1stenergy.com', role: 'Sub-admin', permissions: ['Deliveries', 'Requests'], initials: 'MD' },
  { name: 'Lerato Mokoena', email: 'lerato@1stenergy.com', role: 'Sub-admin', permissions: ['Customers'], initials: 'LM' },
]

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/operations/dashboard', active: true },
  { label: 'Analytics', icon: BarChart3, href: '/operations/dashboard/analytics' },
  { label: 'Deliveries', icon: Truck, href: '/operations/dashboard/orders' },
  { label: 'Drivers', icon: Car, href: '/operations/dashboard/drivers' },
  { label: 'Live Map', icon: MapPinned, href: '/operations/dashboard/live-map' },
  { label: 'Customers', icon: Users, href: '/operations/dashboard/customers' },
  { label: 'Requests', icon: ClipboardList, href: '/operations/dashboard/orders' },
  { label: 'Products', icon: Package, href: '/operations/dashboard/products' },
  { label: 'Banners', icon: GalleryHorizontal, href: '/operations/dashboard/banners' },
  { label: 'Driver Chat', icon: MessageCircle, href: '/operations/dashboard/driver-chat' },
  { label: 'Customer Chat', icon: MessageCircle, href: '/operations/dashboard/customer-chat' },
  { label: 'Wallet Top-Ups', icon: Wallet, href: '/operations/dashboard/wallet' },
  { label: 'Driver Financials', icon: LandmarkIcon, href: '/operations/dashboard/financials' },
  { label: 'Profile', icon: UserCircle, href: '/operations/dashboard/profile' },
  { label: 'Settings', icon: Settings, href: '#' },
]

const activity = [
  ['Fuel delivery confirmed', 'Johannesburg → Pretoria', '08:42'],
  ['New supply request', 'Cape Town commercial account', '08:18'],
  ['Sub-admin access updated', 'Operations team', 'Yesterday'],
]

export default function OperationsDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [team, setTeam] = useState(initialTeam)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [orderStats, setOrderStats] = useState({ active: 0, pending: 0 })
  const router = useRouter()

  useEffect(() => {
    let active = true
    supabase
      .from('orders')
      .select('status')
      .then(({ data }) => {
        if (!active || !data) return
        const pending = data.filter((o) => o.status === 'pending').length
        const activeDeliveries = data.filter((o) => o.status === 'accepted' || o.status === 'picked_up' || o.status === 'on_the_way').length
        setOrderStats({ active: activeDeliveries, pending })
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/operations')
  }

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = inviteName.trim()
    const email = inviteEmail.trim().toLowerCase()
    if (!name || !email) return
    const initials = name.split(/\\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    setTeam((current) => [...current, { name, email, role: 'Sub-admin', permissions: [], initials }])
    setInviteName('')
    setInviteEmail('')
    setInviteSent(true)
  }

  function togglePermission(memberIndex: number, permission: Permission) {
    setTeam((current) => current.map((member, index) => {
      if (index !== memberIndex || member.role === 'Admin') return member
      const permissions = member.permissions.includes(permission)
        ? member.permissions.filter((item) => item !== permission)
        : [...member.permissions, permission]
      return { ...member, permissions }
    }))
  }

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <aside className={`fixed inset-y-0 left-0 z-20 w-64 border-r border-[var(--line)] bg-[var(--cream)] p-5 transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2 font-bold tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-[var(--dark)] text-white"><ShieldCheck className="size-5" /></span>1st Energy</Link><button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X className="size-5" /></button></div>
        <p className="mb-4 mt-10 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Operations</p>
        <nav className="space-y-1">{navItems.map(({ label, icon: Icon, href, active }) => <Link key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? 'bg-[#ebe8df] text-[var(--orange)]' : 'text-[var(--muted)] hover:bg-[#ebe8df]'}`}><Icon className="size-4" />{label}</Link>)}</nav>
        <div className="absolute bottom-5 left-5 right-5"><button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--muted)] hover:bg-[#ebe8df]"><LogOut className="size-4" />Sign out</button></div>
      </aside>
      {sidebarOpen && <button className="fixed inset-0 z-10 bg-[var(--dark)]/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}
      <section className="lg:pl-64"><header className="flex h-20 items-center justify-between border-b border-[var(--line)] bg-[var(--cream)] px-5 sm:px-8"><button className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></button><div className="ml-auto flex items-center gap-5"><Link href="/operations/dashboard/profile" className="text-[var(--muted)] hover:text-[var(--orange)]" aria-label="Notifications"><Bell className="size-5" /></Link><Link href="/operations/dashboard/profile" className="flex items-center gap-3 border-l border-[#e4e9f2] pl-5"><span className="flex size-9 items-center justify-center rounded-full bg-[#fff0e6] text-xs font-bold text-[#c45c1d]">AD</span><div className="hidden sm:block"><p className="text-xs font-bold">Admin account</p><p className="text-[11px] text-[var(--muted)]">Full access</p></div></Link></div></header>
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-8 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Tuesday, 18 September 2026</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Good morning, Admin.</h1><p className="mt-2 text-sm text-[var(--muted)]">Here is what is happening across your operations today.</p></div><div className="hidden items-center gap-3 sm:flex"><Link href="/operations/dashboard/analytics" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-bold text-[var(--ink)]"><BarChart3 className="size-4 text-[var(--orange)]" />View analytics</Link><Link href="/operations/dashboard/orders" className="flex items-center gap-2 rounded-xl bg-[var(--dark)] px-4 py-3 text-xs font-bold text-white">Create request <ChevronRight className="size-4" /></Link></div></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Active deliveries',String(orderStats.active).padStart(2,'0'),'Live across all countries'],['Open requests',String(orderStats.pending).padStart(2,'0'),'Pending orders needing a driver'],['Fleet availability','92%','Healthy'],['Team members','16','2 pending invites']].map(([label,value,detail]) => <Link href="/operations/dashboard/orders" key={label} className="rounded-2xl border border-[var(--line)] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--muted)]">{label}</p><Activity className="size-4 text-[var(--orange)]" /></div><p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs font-semibold text-[#24734a]">{detail}</p></Link>)}</div>
          <CountryStatsGrid />
          <section id="access" className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-base font-bold">Team access</h2><p className="mt-1 text-xs text-[var(--muted)]">Only admins can manage sub-admin permissions.</p></div><button onClick={() => setInviteOpen(!inviteOpen)} className="rounded-xl bg-[var(--dark)] px-4 py-3 text-xs font-bold text-white">{inviteOpen ? 'Close invite form' : 'Invite sub-admin'}</button></div>{inviteOpen && <form onSubmit={submitInvite} className="mt-5 grid gap-3 rounded-2xl bg-[#f5f7fb] p-4 sm:grid-cols-[1fr_1fr_auto]"><input required aria-label="Sub-admin name" value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Full name" className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[#166b8f]" /><input required aria-label="Sub-admin email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" placeholder="Work email" className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[#166b8f]" /><button type="submit" className="h-11 rounded-xl border border-[#166b8f] px-4 text-xs font-bold text-[var(--orange)]">Send invite</button>{inviteSent && <p className="text-xs font-semibold text-[#24734a] sm:col-span-3">Invite added. Set permissions below.</p>}</form>}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[#eef1f5] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]"><th className="pb-3 font-bold">Member</th><th className="pb-3 font-bold">Role</th><th className="pb-3 font-bold">Permissions</th><th className="pb-3 text-right font-bold">Status</th></tr></thead><tbody>{team.map((member, memberIndex) => <tr key={member.email} className="border-b border-[#eef1f5] last:border-0"><td className="py-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-[#ebe8df] text-xs font-bold text-[var(--orange)]">{member.initials}</span><div><p className="text-sm font-semibold">{member.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{member.email}</p></div></div></td><td className="py-4"><span className="rounded-full bg-[#fff0e6] px-3 py-1 text-[11px] font-bold text-[#c45c1d]">{member.role}</span></td><td className="py-4"><div className="flex flex-wrap gap-2">{permissionOptions.map((permission) => <button key={permission} disabled={member.role === 'Admin'} onClick={() => togglePermission(memberIndex, permission)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${member.permissions.includes(permission) ? 'bg-[#ebe8df] text-[var(--orange)]' : 'bg-[#f3f6fa] text-[var(--muted)]'} ${member.role === 'Admin' ? 'cursor-default' : 'hover:ring-2 hover:ring-[#166b8f]/20'}`}>{permission}</button>)}</div></td><td className="py-4 text-right"><span className="text-[11px] font-bold text-[#24734a]">Active</span></td></tr>)}</tbody></table></div></section>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-[var(--line)] bg-white p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-base font-bold">Operations activity</h2><p className="mt-1 text-xs text-[var(--muted)]">Latest updates from your team</p></div><button className="text-xs font-bold text-[var(--orange)]">View all</button></div><div className="divide-y divide-[var(--line)]">{activity.map(([title,description,time]) => <div key={title} className="flex items-center justify-between gap-4 py-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#ebe8df]"><Activity className="size-4 text-[var(--orange)]" /></span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-[var(--muted)]">{description}</p></div></div><span className="text-[11px] text-[var(--muted)]">{time}</span></div>)}</div></section><section className="rounded-2xl border border-[var(--line)] bg-[var(--dark)] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b8e1e9]">Admin control</p><h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Your operations center is ready.</h2><p className="mt-3 text-sm leading-6 text-[#d8eef2]">Manage deliveries, requests and team permissions from one secure workspace.</p><button className="mt-7 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[var(--orange)]">Manage access</button></section></div>
        </div></section>
    </main>
  )
}

