'use client'

import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const roles = [
  { id: 'admin', label: 'Admin', description: 'Full operations access', badge: 'A' },
  { id: 'sub-admin', label: 'Sub-admin', description: 'Permission-based access', badge: 'SA' },
] as const

type Role = (typeof roles)[number]['id']

export function OperationsLogin() {
  const [role, setRole] = useState<Role>('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError || !data.user) {
        setError(signInError?.message || 'Could not sign in. Check your email and password.')
        return
      }

      // Only admin accounts may enter the Operations Center. Verify the role
      // against the shared users table before letting them through, and sign
      // back out if they are a driver/customer who happens to have an account.
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        setError('This account is not an approved Operations account.')
        return
      }

      router.push('/operations/dashboard')
    } catch (err) {
      console.error('[v0] Operations sign-in failed:', err)
      setError('Something went wrong signing in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#14213d]">
      <header className="flex items-center justify-between border-b border-[#e4e9f2] bg-white px-5 py-4 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#40516f] transition hover:text-[#166b8f]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to website
        </Link>
        <div className="flex items-center gap-2 text-sm font-bold tracking-[0.16em] text-[#166b8f]">
          <ShieldCheck className="size-5" aria-hidden="true" />
          OPERATIONS
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-5 py-12 lg:grid-cols-[1fr_440px] lg:px-10">
        <div className="hidden lg:block">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[#e07a35]">Restricted access</p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#14213d]">Keep every operation moving with confidence.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#64718a]">The Operations Center is reserved for approved admins and sub-admins. Drivers and customers cannot sign in here.</p>
          <div className="mt-10 flex gap-3 text-sm text-[#52627d]"><span className="rounded-full bg-[#e6f3f6] px-4 py-2 font-semibold text-[#166b8f]">Admin controlled</span><span className="rounded-full bg-[#fff0e6] px-4 py-2 font-semibold text-[#c45c1d]">Role protected</span></div>
        </div>

        <div className="rounded-3xl border border-[#e1e7f0] bg-white p-6 shadow-[0_20px_60px_rgba(20,33,61,0.08)] sm:p-9">
          <div className="mb-8">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#e7f4f7] text-[#166b8f]"><LockKeyhole className="size-6" aria-hidden="true" /></div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Sign in to Operations</h2>
            <p className="mt-2 text-sm leading-6 text-[#718099]">Use your approved operations account to continue.</p>
          </div>

          <div className="mb-7 grid grid-cols-2 gap-2 rounded-2xl bg-[#f3f6fa] p-1" role="tablist" aria-label="Account type">
            {roles.map((item) => <button key={item.id} type="button" onClick={() => setRole(item.id)} className={`rounded-xl px-3 py-3 text-left transition ${role === item.id ? 'bg-white shadow-sm ring-1 ring-[#dfe7ef]' : 'text-[#718099]'}`} role="tab" aria-selected={role === item.id}><span className={`mr-2 inline-flex size-7 items-center justify-center rounded-lg text-xs font-bold ${role === item.id ? 'bg-[#166b8f] text-white' : 'bg-[#e2e8f0] text-[#718099]'}`}>{item.badge}</span><span className="text-sm font-semibold">{item.label}</span><span className="mt-1 block pl-9 text-[11px] font-normal">{item.description}</span></button>)}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-semibold">Work email</span><span className="relative block"><UserRound className="absolute left-3.5 top-3.5 size-4 text-[#8c99ad]" aria-hidden="true" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="h-11 w-full rounded-xl border border-[#dce3ed] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-[#a1adbd] focus:border-[#166b8f] focus:ring-4 focus:ring-[#166b8f]/10" /></span></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><span className="relative block"><LockKeyhole className="absolute left-3.5 top-3.5 size-4 text-[#8c99ad]" aria-hidden="true" /><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-11 w-full rounded-xl border border-[#dce3ed] bg-white pl-10 pr-11 text-sm outline-none transition placeholder:text-[#a1adbd] focus:border-[#166b8f] focus:ring-4 focus:ring-[#166b8f]/10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-[#8c99ad] hover:text-[#166b8f]" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>
            <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-[#718099]"><input type="checkbox" className="size-4 rounded border-[#cbd5e1] accent-[#166b8f]" />Remember this device</label><button type="button" className="font-semibold text-[#166b8f] hover:underline">Forgot password?</button></div>
            {error && <p className="rounded-xl bg-[#fdecec] px-4 py-3 text-xs leading-5 text-[#b42318]" role="alert">{error}</p>}
            <button type="submit" disabled={submitting} className="h-12 w-full rounded-xl bg-[#166b8f] text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,107,143,0.2)] transition hover:bg-[#125a78] focus:outline-none focus:ring-4 focus:ring-[#166b8f]/20 disabled:opacity-60">{submitting ? 'Signing in…' : `Continue as ${role === 'admin' ? 'Admin' : 'Sub-admin'}`}</button>
          </form>
          {notice && <p className="mt-4 rounded-xl bg-[#eaf6f0] px-4 py-3 text-xs leading-5 text-[#24734a]" role="status">{notice}</p>}
          <p className="mt-7 text-center text-[11px] leading-5 text-[#8c99ad]">Access is limited to approved Admin and Sub-admin accounts.<br />Drivers and customers must use the main website.</p>
        </div>
      </section>
    </main>
  )
}

export default OperationsLogin
