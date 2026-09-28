'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  Fuel,
  Headphones,
  Menu,
  MapPin,
  Mail,
  Navigation,
  Phone,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
  Zap,
  Flame,
  Droplet,
  Wrench,
  UserPlus,
  ClipboardList,
  Route,
  PackageCheck,
  Store,
  Globe,
} from 'lucide-react'
import { SouthernAfricaMap } from '@/components/southern-africa-map'

const CONTACT_PHONE_DISPLAY = '+267 77 346 071'
const CONTACT_PHONE_TEL = 'tel:+26777346071'
const CONTACT_EMAIL = '1energyleano@gmail.com'
const CONTACT_WEBSITE_DISPLAY = '1stenergyapp.com'
const CONTACT_WEBSITE_URL = 'https://1stenergyapp.com'

const services = [
  {
    icon: Flame,
    title: 'LPG gas delivery',
    photo: '/service-lpg.jpg',
    photoAlt: '1st Energy driver delivering an LPG gas cylinder to a home',
    photoPosition: 'center 22%',
    description: 'Booking and ordering your gas made easy — refill or new cylinder, delivered fast.',
    link: 'Order gas',
  },
  {
    icon: Fuel,
    title: 'Fuel delivery',
    photo: '/service-fuel.jpg',
    photoAlt: 'Fuel being poured from a canister into a car',
    photoPosition: 'center 55%',
    description: 'Never run out of fuel again — petrol, diesel and paraffin dropped where you need it.',
    link: 'Order fuel',
  },
  {
    icon: Truck,
    title: 'Emergency fuel assistance',
    photo: '/service-emergency.jpg',
    photoAlt: 'Driver refuelling a stranded car at night',
    photoPosition: 'center 40%',
    description: 'Stranded on the road? Get emergency fuel delivered straight to your location.',
    link: 'Request assistance',
  },
]

const whyChoose = [
  { icon: MapPin, title: 'Live order tracking', description: 'Watch your order come to you in real time, from confirmation to doorstep.' },
  { icon: ShieldCheck, title: 'Trusted suppliers', description: 'Every gas and fuel supplier on 1st Energy is vetted and approved.' },
  { icon: Zap, title: 'Fast delivery', description: 'Simple ordering that gets your fuel or gas to you when you need it.' },
  { icon: CreditCard, title: 'Cash or card', description: 'Pay however suits you, safely and securely, every time.' },
  { icon: Smartphone, title: 'Fully automated', description: 'Order, pay and track it all from the app, wherever you are.' },
  { icon: Headphones, title: 'Fully supported', description: 'Our team is on hand around the clock if anything needs sorting.' },
]

const products = [
  { icon: Flame, name: 'LP gas', tagline: '9kg · 14kg · 19kg' },
  { icon: Fuel, name: 'Petrol', tagline: '93 · 95 unleaded' },
  { icon: Droplet, name: 'Diesel', tagline: '50ppm · 500ppm' },
  { icon: Wrench, name: 'Accessories', tagline: 'Regulators & hoses' },
]

const orderSteps = [
  { icon: UserPlus, title: 'Register', description: "Create your account and set up your delivery address in minutes." },
  { icon: ClipboardList, title: 'Choose product', description: 'Pick gas, fuel or an accessory from a trusted local supplier.' },
  { icon: MapPin, title: 'Share your location', description: 'Confirm exactly where you are so your order is dropped in the right place.' },
  { icon: Route, title: 'Track your delivery', description: 'Follow your driver in real time from confirmation to arrival.' },
  { icon: PackageCheck, title: 'Receive your order', description: 'Get your products safely and pay by cash or card at the door.' },
]

const flowSteps = [
  { title: 'Customer', description: 'Orders through the app' },
  { title: '1st Energy', description: 'Connects order to a vendor' },
  { title: 'Vendor', description: 'Accepts and dispatches order' },
  { title: 'Delivery', description: 'Arrives at their location' },
]

const regions = ['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'Zambia', 'Mozambique', 'Eswatini']

const heroSlides = [
  {
    tone: 'photo',
    number: '01',
    caption: 'Built for the long haul',
  },
  {
    tone: 'orange',
    number: '02',
    icon: Fuel,
    eyebrow: 'Running on empty?',
    headline: 'Out of gas?',
    sub: "Don't wait around — order a refill and we'll deliver it straight to your door.",
    cta: 'Order now',
    href: '#services',
    caption: 'Never run dry again',
    tags: ['Fast dispatch', 'Cash or card'],
  },
  {
    tone: 'dark',
    number: '03',
    icon: Zap,
    eyebrow: 'Stranded on the road?',
    headline: 'Need emergency fuel?',
    sub: "Tell us where you are and we'll dispatch a driver to get you moving again.",
    cta: 'Order now',
    href: '#services',
    caption: '24/7 emergency response',
    tags: ['Live tracking', 'Round the clock'],
  },
  {
    tone: 'green',
    number: '04',
    icon: UserPlus,
    eyebrow: 'Earn on your own schedule',
    headline: 'Drive. Deliver. Earn.',
    sub: 'Sign up as a 1st Energy driver and start making money on every delivery.',
    cta: 'Download the app',
    href: '#playstore',
    caption: 'Now recruiting drivers',
    tags: ['Flexible hours', 'Weekly payouts'],
  },
]

function PlayStoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="play-triangle">
          <path d="M4 3.2C4 2.2 5.1 1.6 5.9 2.1L20.5 11c.7.4.7 1.5 0 2L5.9 21.9c-.8.5-1.9-.1-1.9-1.1V3.2Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#play-triangle)">
        <rect x="0" y="0" width="24" height="8.6" fill="#00D2FF" />
        <rect x="0" y="8.6" width="24" height="2.4" fill="#FF3D57" />
        <rect x="0" y="11" width="24" height="2.4" fill="#FFC900" />
        <rect x="0" y="13.4" width="24" height="10.6" fill="#3BD671" />
      </g>
    </svg>
  )
}

function GasCanisterScene() {
  return (
    <svg className="hero-slide-scene" viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {[...Array(14)].map((_, i) => (
        <circle key={i} cx={(i * 71 + 30) % 380 + 10} cy={(i * 53 + 20) % 150 + 10} r={i % 3 === 0 ? 2.4 : 1.4} fill="#ffffff" opacity={i % 2 === 0 ? 0.35 : 0.18} />
      ))}
      <ellipse cx="230" cy="292" rx="120" ry="16" fill="#000000" opacity="0.16" />
      <circle cx="300" cy="70" r="46" fill="#ffffff" opacity="0.1" />
      <circle cx="300" cy="70" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M292 55 L296 78 L286 78 L296 92 L316 65 L304 65 L312 55 Z" fill="#ffffff" opacity="0.9" />
      <rect x="176" y="118" width="108" height="150" rx="18" fill="#ffffff" opacity="0.92" />
      <rect x="176" y="118" width="54" height="150" rx="18" fill="#ffffff" opacity="0.12" />
      <rect x="204" y="92" width="52" height="30" rx="8" fill="#ffffff" opacity="0.92" />
      <circle cx="230" cy="88" r="9" fill="#ffffff" opacity="0.92" />
      <rect x="188" y="160" width="84" height="6" rx="3" fill="#000000" opacity="0.12" />
      <rect x="188" y="182" width="84" height="6" rx="3" fill="#000000" opacity="0.12" />
      <circle cx="140" cy="200" r="44" fill="#141414" opacity="0.28" />
      <circle cx="140" cy="200" r="44" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" />
      {[...Array(9)].map((_, i) => {
        const angle = (Math.PI * (0.75 + (i / 8) * 1.5))
        const x1 = 140 + Math.cos(angle) * 34
        const y1 = 200 + Math.sin(angle) * 34
        const x2 = 140 + Math.cos(angle) * 40
        const y2 = 200 + Math.sin(angle) * 40
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
      })}
      <line x1="140" y1="200" x2="118" y2="212" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="140" cy="200" r="4" fill="#ffffff" />
      <text x="112" y="235" fontFamily="DM Mono, monospace" fontSize="10" fill="#ffffff" opacity="0.7">E</text>
      <text x="163" y="235" fontFamily="DM Mono, monospace" fontSize="10" fill="#ffffff" opacity="0.7">F</text>
    </svg>
  )
}

function RoadsideScene() {
  return (
    <svg className="hero-slide-scene" viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {[...Array(16)].map((_, i) => (
        <circle key={i} cx={(i * 61 + 20) % 390} cy={(i * 37 + 10) % 140 + 6} r={i % 4 === 0 ? 1.8 : 1.1} fill="#ffffff" opacity={i % 3 === 0 ? 0.5 : 0.22} />
      ))}
      <circle cx="90" cy="60" r="34" fill="#ffffff" opacity="0.08" />
      <path d="M40 300 C160 250 260 250 380 300" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" fill="none" />
      <path d="M40 300 C160 250 260 250 380 300" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2" strokeDasharray="10 10" fill="none" />
      <ellipse cx="270" cy="272" rx="88" ry="14" fill="#000000" opacity="0.25" />
      <g>
        <rect x="205" y="205" width="130" height="48" rx="14" fill="#ffffff" opacity="0.94" />
        <path d="M222 205 L245 178 L295 178 L318 205 Z" fill="#ffffff" opacity="0.94" />
        <rect x="253" y="185" width="34" height="16" rx="3" fill="#000000" opacity="0.18" />
        <circle cx="232" cy="256" r="17" fill="#141414" opacity="0.55" />
        <circle cx="232" cy="256" r="17" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
        <circle cx="308" cy="256" r="17" fill="#141414" opacity="0.55" />
        <circle cx="308" cy="256" r="17" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
        <rect x="330" y="220" width="10" height="8" rx="2" fill="#ffe9a8" opacity="0.9" />
      </g>
      <g transform="translate(255,140)">
        <path d="M0 -22 L20 14 L-20 14 Z" fill="#ffffff" opacity="0.95" />
        <rect x="-2.5" y="-8" width="5" height="12" rx="2" fill="#c94f1e" />
        <circle cx="0" cy="8" r="2.4" fill="#c94f1e" />
      </g>
      <g transform="translate(88,70)">
        <circle r="20" fill="#ffffff" opacity="0.18" className="hero-scene-pulse" />
        <path d="M0 -18 C11 -18 18 -10 18 0 C18 13 0 30 0 30 C0 30 -18 13 -18 0 C-18 -10 -11 -18 0 -18 Z" fill="#ffffff" opacity="0.95" />
        <circle cx="0" cy="-1" r="6" fill="#141c1f" opacity="0.6" />
      </g>
      <path d="M96 88 C140 120 190 150 226 168" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="6 8" fill="none" />
    </svg>
  )
}

function DriverScene() {
  return (
    <svg className="hero-slide-scene" viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {[...Array(6)].map((_, i) => (
        <g key={i} transform={`translate(${300 + (i % 3) * 22} ${40 + Math.floor(i / 3) * 26})`}>
          <path d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" fill="#ffffff" opacity="0.55" />
        </g>
      ))}
      <path d="M20 300 C150 260 260 260 385 300" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3" fill="none" />
      <ellipse cx="205" cy="278" rx="95" ry="14" fill="#000000" opacity="0.22" />
      <g transform="translate(70,60)">
        <rect x="-38" y="-46" width="76" height="112" rx="12" fill="#ffffff" opacity="0.16" />
        <rect x="-38" y="-46" width="76" height="112" rx="12" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.5" />
        <rect x="-26" y="-30" width="52" height="8" rx="4" fill="#ffffff" opacity="0.55" />
        <circle cx="-8" cy="10" r="22" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.5" />
        <path d="M-8 10 L2 -2" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="2" cy="-2" r="3" fill="#ffffff" />
        <rect x="-24" y="40" width="48" height="7" rx="3.5" fill="#ffffff" opacity="0.4" />
      </g>
      <g transform="translate(215,150)">
        <circle cx="-55" cy="95" r="24" fill="#141c1f" opacity="0.5" />
        <circle cx="-55" cy="95" r="24" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2.5" />
        <circle cx="55" cy="95" r="24" fill="#141c1f" opacity="0.5" />
        <circle cx="55" cy="95" r="24" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2.5" />
        <path d="M-55 95 L-20 95 L5 45 L45 45" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 95 L55 60 L20 60" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="18" y="18" width="42" height="34" rx="6" fill="#ffffff" opacity="0.94" />
        <rect x="26" y="4" width="26" height="16" rx="4" fill="#ffffff" opacity="0.94" />
        <circle cx="5" cy="40" r="16" fill="#ffffff" opacity="0.94" />
        <path d="M-3 40 Q5 22 13 40" fill="none" stroke="#141c1f" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g transform="translate(320,120)">
        <circle r="20" fill="#ffe9a8" opacity="0.95" />
        <circle r="20" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" />
        <text x="0" y="5" fontFamily="Manrope, sans-serif" fontSize="16" fontWeight="800" fill="#8a6a12" textAnchor="middle">$</text>
      </g>
      <g transform="translate(348,168)">
        <circle r="13" fill="#ffe9a8" opacity="0.9" />
        <text x="0" y="4" fontFamily="Manrope, sans-serif" fontSize="11" fontWeight="800" fill="#8a6a12" textAnchor="middle">$</text>
      </g>
    </svg>
  )
}

function StorefrontScene() {
  return (
    <svg className="hero-slide-scene" viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <ellipse cx="200" cy="268" rx="150" ry="16" fill="#000000" opacity="0.18" />
      <rect x="90" y="120" width="220" height="140" rx="6" fill="#ffffff" opacity="0.14" />
      <rect x="90" y="120" width="220" height="140" rx="6" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.5" />
      <path d="M78 122 L92 78 L308 78 L322 122 Z" fill="#ffffff" opacity="0.92" />
      {[...Array(6)].map((_, i) => (
        <rect key={i} x={92 + i * 37} y="122" width="34" height="14" fill={i % 2 === 0 ? '#f26b35' : '#ffffff'} opacity={i % 2 === 0 ? 0.9 : 0.92} />
      ))}
      <rect x="120" y="170" width="160" height="90" rx="4" fill="#141c1f" opacity="0.25" />
      <rect x="140" y="186" width="44" height="58" rx="3" fill="#ffffff" opacity="0.85" />
      <rect x="196" y="186" width="44" height="58" rx="3" fill="#ffffff" opacity="0.7" />
      <rect x="252" y="186" width="20" height="58" rx="3" fill="#ffffff" opacity="0.55" />
      <circle cx="200" cy="98" r="12" fill="#ffe9a8" opacity="0.92" />
    </svg>
  )
}

const heroScenes = { orange: GasCanisterScene, dark: RoadsideScene, green: DriverScene } as const


export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const [slidePaused, setSlidePaused] = useState(false)

  useEffect(() => {
    if (slidePaused) return
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [slidePaused])

  useEffect(() => {
    const revealEls = Array.from(document.querySelectorAll('.reveal'))
    if (!revealEls.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    revealEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <main>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#top" className="brand" aria-label="1st Energy home">
            <span className="brand-lockup"><img src="/icon.svg" alt="" className="brand-logo brand-mark-image" /><span>1st Energy</span></span>
          </a>
          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
            <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#coverage" onClick={() => setMenuOpen(false)}>Coverage</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About us</a>
            <a className="mobile-cta" href="/operations" onClick={() => setMenuOpen(false)}>Operations <ArrowRight aria-hidden="true" /></a>
          </nav>
          <div className="header-actions">
            <a className="phone-link" href={CONTACT_PHONE_TEL}><Phone aria-hidden="true" /> {CONTACT_PHONE_DISPLAY}</a>
            <a className="button button-dark header-cta" href="/operations">Operations <ArrowRight aria-hidden="true" /></a>
            <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {showBanner && (
        <div className="top-banner">
          <div className="top-banner-bg" aria-hidden="true" />
          <div className="top-banner-inner">
            <span className="top-banner-text"><Flame aria-hidden="true" /> Fuel &amp; LPG delivered straight to your door — order in minutes.</span>
            <a className="top-banner-cta" href="#playstore">Get the app <ArrowRight aria-hidden="true" /></a>
          </div>
          <button className="top-banner-close" aria-label="Dismiss banner" onClick={() => setShowBanner(false)}><X aria-hidden="true" /></button>
        </div>
      )}

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow hero-anim" style={{ animationDelay: '0ms' }}><span className="eyebrow-line" /> Fuel &amp; gas delivery app</p>
            <h1 className="hero-anim" style={{ animationDelay: '80ms' }}>Fuel &amp; gas delivered.<br /><em>When you</em> need it.</h1>
            <p className="hero-lead hero-anim" style={{ animationDelay: '160ms' }}>Your trusted marketplace for LP gas, fuel and emergency delivery — ordered from your phone, delivered to your door.</p>
            <div className="hero-actions hero-anim" style={{ animationDelay: '240ms' }}>
              <a className="button button-orange" href="#playstore"><PlayStoreIcon /> Get it on Playstore</a>
              <a className="text-link" href="#how-it-works">How it works <span>↗</span></a>
            </div>
            <div className="trust-row hero-anim" style={{ animationDelay: '320ms' }}>
              <span><ShieldCheck aria-hidden="true" /> Verified suppliers</span>
              <span><Clock3 aria-hidden="true" /> 24/7 response</span>
              <span><MapPin aria-hidden="true" /> 7 countries</span>
            </div>
          </div>
          <div
            className="hero-visual hero-anim"
            style={{ animationDelay: '200ms' }}
            onMouseEnter={() => setSlidePaused(true)}
            onMouseLeave={() => setSlidePaused(false)}
          >
            <div className="visual-frame float-slow">
              <div className="visual-photo">
                {heroSlides.map((slide, index) => {
                  const isActive = index === activeSlide
                  if (slide.tone === 'photo') {
                    return (
                      <div
                        key={slide.number}
                        className={`hero-slide hero-slide-photo ${isActive ? 'is-active' : ''}`}
                        role="img"
                        aria-label="Fuel tanker travelling through the Southern African landscape"
                        aria-hidden={!isActive}
                      />
                    )
                  }
                  const Scene = heroScenes[slide.tone as keyof typeof heroScenes]
                  return (
                    <div
                      key={slide.number}
                      className={`hero-slide hero-slide-promo tone-${slide.tone} ${isActive ? 'is-active' : ''}`}
                      aria-hidden={!isActive}
                    >
                      <Scene />
                      <span className="hero-slide-scrim" aria-hidden="true" />
                      <span className="hero-slide-ghost-number" aria-hidden="true">{slide.number}</span>
                      <div className="hero-slide-copy">
                        <span className="hero-slide-eyebrow">{slide.eyebrow}</span>
                        <h3>{slide.headline}</h3>
                        <p>{slide.sub}</p>
                        <div className="hero-slide-tags">{slide.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div>
                        <a className="hero-slide-cta" href={slide.href}>{slide.cta} <ArrowRight aria-hidden="true" /></a>
                      </div>
                    </div>
                  )
                })}
                <div className="hero-slide-dots">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.number}
                      type="button"
                      className={`hero-slide-dot ${index === activeSlide ? 'is-active' : ''}`}
                      aria-label={`Show slide ${index + 1}: ${slide.caption}`}
                      onClick={() => setActiveSlide(index)}
                    />
                  ))}
                </div>
              </div>
              <div className="visual-caption"><span>{heroSlides[activeSlide].number}</span><span>{heroSlides[activeSlide].caption}</span></div>
            </div>
            <div className="location-card float-slow-delayed"><span className="live-dot" /><div><strong>Live in 7 countries</strong><small>Southern Africa, connected</small></div><ArrowRight aria-hidden="true" /></div>
          </div>
        </div>
        <div className="container hero-foot"><span>Trusted by households, businesses and drivers who can&apos;t afford to stop.</span><span className="scroll-note">Scroll to explore <span>↓</span></span></div>
      </section>

      <section className="feature-section" id="why-us">
        <div className="container section-heading"><div><p className="eyebrow">Why choose 1st Energy</p><h2>Simple. Fast.<br /><em>Reliable.</em></h2></div><p>No more waiting in line or running out at the worst moment — order gas or fuel delivery straight from the app, wherever you are.</p></div>
        <div className="container feature-grid">{whyChoose.map(({ icon: Icon, title, description }, index) => <div className="feature-card reveal" style={{ transitionDelay: `${(index % 3) * 90}ms` }} key={title}><Icon className="feature-icon" aria-hidden="true" /><h3>{title}</h3><p>{description}</p></div>)}</div>
      </section>

      <section className="service-intro" id="services">
        <div className="container"><a className="services-banner" href="#playstore" aria-label="Get the 1st Energy app"><img src="/services-banner.jpg" alt="Fuel and gas delivered when you need it: driver refuelling a car at night" loading="lazy" /></a></div>
        <div className="container section-heading"><div><p className="eyebrow">Our services</p><h2>More than just delivery.</h2></div><p>1st Energy connects you with approved suppliers and drivers for gas, fuel and emergency services.</p></div>
        <div className="container service-grid">{services.map(({ icon: Icon, title, description, link, photo, photoAlt, photoPosition }, index) => { return <article className="service-card reveal" style={{ transitionDelay: `${index * 100}ms` }} key={title}><div className="service-visual"><img src={photo} alt={photoAlt} loading="lazy" style={{ objectPosition: photoPosition }} /></div><div className="service-number">0{index + 1}</div><Icon className="service-icon" aria-hidden="true" /><h3>{title}</h3><p>{description}</p><a href="#quote">{link} <ArrowRight aria-hidden="true" /></a></article> })}</div>
      </section>

      <section className="products-section">
        <div className="container section-heading"><div><p className="eyebrow">Our products</p><h2>Everything you need,<br /><em>in one place.</em></h2></div><p>From cooking gas to fuel and accessories, 1st Energy gives you access to a wide range of energy products from trusted sellers.</p></div>
        <div className="container products-grid">{products.map(({ icon: Icon, name, tagline }, index) => <div className="product-card reveal" style={{ transitionDelay: `${index * 90}ms` }} key={name}><Icon className="product-icon" aria-hidden="true" /><h3>{name}</h3><span>{tagline}</span></div>)}</div>
      </section>

      <section className="order-section" id="how-it-works"><span id="operations" className="section-anchor" aria-hidden="true" />
        <div className="container section-heading light"><div><p className="eyebrow eyebrow-light">How to order</p><h2>From your phone<br /><em>to your door.</em></h2></div><p className="order-copy">Ordering is simple and quick, just a few taps to get your energy on the way.</p></div>
        <div className="container order-steps">{orderSteps.map(({ icon: Icon, title, description }, index) => <div className="order-step reveal" style={{ transitionDelay: `${index * 90}ms` }} key={title}><span className="order-step-number">0{index + 1}</span><Icon className="order-step-icon" aria-hidden="true" /><h3>{title}</h3><p>{description}</p></div>)}</div>
      </section>

      <section className="dark-section">
        <div className="container dark-grid"><div><p className="eyebrow eyebrow-light">A marketplace, not just an app</p><h2>How 1st Energy<br /><em>works.</em></h2><p className="dark-lead">We connect customers directly with approved gas and fuel vendors, so every order goes to someone ready to deliver it.</p><a className="button button-orange" href="#quote">Talk to our team <ArrowRight aria-hidden="true" /></a></div><div className="steps">{flowSteps.map((step, index) => <div className="step reveal" style={{ transitionDelay: `${index * 90}ms` }} key={step.title}><span>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></div>)}</div></div>
      </section>

      <section className="cta-section">
        <div className="container cta-grid">
          <div className="cta-card reveal"><div className="cta-visual tone-green"><DriverScene /></div><Truck className="cta-icon" aria-hidden="true" /><h3>Turn your vehicle into an opportunity</h3><p>Join 1st Energy as a driver and start earning by delivering gas and fuel in your area.</p><ul className="cta-list"><li><Check aria-hidden="true" /> Flexible working hours</li><li><Check aria-hidden="true" /> Weekly payouts</li><li><Check aria-hidden="true" /> Full driver support</li></ul><a className="button button-dark" href="#quote">Become a driver <ArrowRight aria-hidden="true" /></a></div>
          <div className="cta-card reveal" style={{ transitionDelay: '100ms' }}><div className="cta-visual tone-orange"><StorefrontScene /></div><Store className="cta-icon" aria-hidden="true" /><h3>Take your products to more customers</h3><p>List your gas, fuel or accessories on 1st Energy and reach customers across your region.</p><ul className="cta-list"><li><Check aria-hidden="true" /> Real-time orders</li><li><Check aria-hidden="true" /> Simple vendor dashboard</li><li><Check aria-hidden="true" /> Secure payouts</li></ul><a className="button button-dark" href="#quote">Become a vendor <ArrowRight aria-hidden="true" /></a></div>
        </div>
      </section>

      <section className="coverage-section" id="coverage"><div className="container coverage-grid"><div className="reveal"><p className="eyebrow">Where we operate</p><h2>Local where it counts.<br /><em>Regional by design.</em></h2><p className="coverage-copy">A growing network across Southern Africa gives you one trusted partner, wherever the road takes you.</p><a className="text-link" href="#quote">Check your area <ArrowRight aria-hidden="true" /></a></div><div className="map-panel reveal"><div className="map-lines" aria-hidden="true" /><div className="map-label"><span className="map-pin pulse-ring"><MapPin aria-hidden="true" /></span><div><strong>Southern Africa</strong><small>7 countries covered</small></div></div><div className="map-illustration"><SouthernAfricaMap /></div><div className="region-list">{regions.map((region, index) => <span key={region}><b>0{index + 1}</b>{region}</span>)}</div></div></div></section>

      <section className="quote-section" id="quote"><div className="container quote-grid"><div className="reveal"><p className="eyebrow">Start a conversation</p><h2>Let&apos;s keep<br /><em>you moving.</em></h2><p>Tell us a little about what you need and one of our team will be in touch.</p><div className="contact-line"><Phone aria-hidden="true" /><a href={CONTACT_PHONE_TEL}>{CONTACT_PHONE_DISPLAY}</a><span>24/7 response line</span></div><div className="contact-line"><Mail aria-hidden="true" /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div><div className="contact-line"><Globe aria-hidden="true" /><a href={CONTACT_WEBSITE_URL} target="_blank" rel="noreferrer">{CONTACT_WEBSITE_DISPLAY}</a></div></div><form className="quote-form reveal" onSubmit={(event) => { event.preventDefault(); setSubmitted(true) }}>{submitted ? <div className="success-state"><div><Check aria-hidden="true" /></div><h3>Thanks, we&apos;ll be in touch.</h3><p>Your request is with our team. We&apos;ll get back to you shortly.</p><button className="text-link" type="button" onClick={() => setSubmitted(false)}>Send another request <ArrowRight aria-hidden="true" /></button></div> : <><label>Your name<input required name="name" placeholder="e.g. Thabo Mokoena" /></label><label>Work email<input required type="email" name="email" placeholder="you@company.com" /></label><label>What can we help with?<select name="service" defaultValue=""><option value="" disabled>Select a service</option><option>Fuel delivery</option><option>LP gas</option><option>Roadside assistance</option><option>Commercial supply</option></select></label><button className="button button-dark" type="submit">Send request <ArrowRight aria-hidden="true" /></button></>}</form></div></section>

      <footer className="site-footer" id="about">
        <div className="container footer-cta"><div><h2>Your energy.<br /><em>Your location. Your delivery.</em></h2></div><div className="app-badges" id="playstore"><a className="badge" href="#"><PlayStoreIcon /><span><small>Get it on</small><strong>Google Play</strong></span></a><a className="badge" href="#"><Smartphone aria-hidden="true" /><span><small>Download on the</small><strong>App Store</strong></span></a></div></div>
        <div className="container footer-top"><div><a className="brand brand-light" href="#top"><span className="brand-lockup"><img src="/icon.svg" alt="" className="brand-logo brand-mark-image" /><span>1st Energy</span></span></a><p>Fuel &amp; gas delivered.<br />When you need it.</p></div><div className="footer-contact"><a href={CONTACT_PHONE_TEL}><Phone aria-hidden="true" /> {CONTACT_PHONE_DISPLAY}</a><a href={`mailto:${CONTACT_EMAIL}`}><Mail aria-hidden="true" /> {CONTACT_EMAIL}</a><a href={CONTACT_WEBSITE_URL} target="_blank" rel="noreferrer"><Globe aria-hidden="true" /> {CONTACT_WEBSITE_DISPLAY}</a></div><div className="footer-links"><a href="#services">Services</a><a href="#coverage">Coverage</a><a href="#quote">Contact</a></div></div>
        <div className="container footer-bottom"><span>© 2025 1st Energy. All rights reserved.</span><span>{CONTACT_PHONE_DISPLAY} · Fuel. Gas. Response.</span></div>
      </footer>
    </main>
  )
}
