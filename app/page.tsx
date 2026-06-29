"use client";

import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════
// A5EC60  - Bright Lime Green (primary accent)
// 419310  - Vibrant Green     (secondary)
// 1C621B  - Deep Forest Green (dark accent)
// 487070  - Slate Teal        (neutral)
// 18333D  - Dark Navy         (text/bg)
// 0B1E26  - Near Black        (bg)

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" stroke="#A5EC60" strokeWidth="2.5"/>
    <path d="M10 16L14 20L22 12" stroke="#A5EC60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6.5" stroke="#A5EC60" strokeWidth="1.2"/>
    <path d="M6 5L9 7L6 9V5Z" fill="#A5EC60"/>
  </svg>
);

const AuctionIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A5EC60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
  </svg>
);

const BidIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A5EC60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
    <path d="M12 3v12"/>
    <rect x="3" y="15" width="18" height="6" rx="2"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A5EC60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/>
    <path d="M6 3.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" strokeWidth="1"/>
    <path d="M7 1.5c-2.5 0-5 2-5 5.5 0 3.5 5 5.5 5 5.5s5-2 5-5.5c0-3.5-2.5-5.5-5-5.5z" stroke="currentColor" strokeWidth="1"/>
  </svg>
);

const SearchInputIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="9" cy="9" r="7" stroke="#487070" strokeWidth="1.5"/>
    <path d="M15 15L18 18" stroke="#487070" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 16c0-3 3-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════
// ANIMATION HOOK
// ═══════════════════════════════════════════════════════════════════
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ═══════════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════════

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = ["Auctions", "Properties", "How It Works", "About", "Contact"];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? "bg-[#0B1E26]/95 backdrop-blur-xl border-b border-[#18333D]/50" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <LogoIcon />
          <span className="text-xl font-bold text-white tracking-tight">TrustBid</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a key={link} href={`#${link.toLowerCase().replace(/\s/g, "-")}`}
              className="text-sm font-medium text-[#487070] hover:text-[#A5EC60] transition-colors duration-300 relative group">
              {link}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#A5EC60] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-[#487070] hover:text-[#A5EC60] px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border border-[#18333D] hover:border-[#A5EC60]/30 flex items-center gap-2">
            <UserIcon />
            Login
          </Link>
          <Link href="/signup" className="bg-[#419310] hover:bg-[#A5EC60] text-white hover:text-[#0B1E26] px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 hover:shadow-lg hover:shadow-[#A5EC60]/20 hover:-translate-y-0.5 active:translate-y-0">
            Register
          </Link>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0B1E26]/98 backdrop-blur-xl border-t border-[#18333D]/50 px-4 py-6 space-y-4">
          {links.map((link) => (
            <a key={link} href={`#${link.toLowerCase().replace(/\s/g, "-")}`}
              className="block text-[#487070] hover:text-[#A5EC60] text-base font-medium py-2 transition-colors"
              onClick={() => setMenuOpen(false)}>
              {link}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-4 border-t border-[#18333D]/50">
            <Link href="/login" className="text-center text-[#487070] hover:text-[#A5EC60] px-5 py-3 rounded-full text-sm font-semibold transition-all border border-[#18333D] hover:border-[#A5EC60]/30 flex items-center justify-center gap-2">
              <UserIcon />
              Login
            </Link>
            <Link href="/signup" className="text-center bg-[#419310] hover:bg-[#A5EC60] text-white hover:text-[#0B1E26] px-5 py-3 rounded-full text-sm font-bold transition-all">
              Register
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HERO with background image slideshow
// ═══════════════════════════════════════════════════════════════════

function Hero() {
  const [currentBg, setCurrentBg] = useState(0);

  const backgrounds = [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&h=900&fit=crop",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1600&h=900&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&h=900&fit=crop",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&h=900&fit=crop",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgrounds.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background images with crossfade */}
      {backgrounds.map((bg, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: currentBg === i ? 1 : 0 }}
        >
          <img
            src={bg}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0B1E26]/75" />
        </div>
      ))}

      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#A5EC60]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#419310]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Content - perfectly centered */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-20 pb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#18333D]/80 border border-[#487070]/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#A5EC60] animate-pulse" />
          <span className="text-xs sm:text-sm font-medium text-[#A5EC60]">Malawi&apos;s First Online Auction Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
          <span className="block">Your Auction</span>
          <span className="block">Journey Starts</span>
          <span className="block bg-gradient-to-r from-[#A5EC60] to-[#419310] bg-clip-text text-transparent">
            Here.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#487070] max-w-lg mx-auto leading-relaxed mb-10 px-4">
          Discover premium real estate and vehicle auctions across Malawi. 
          Register remotely, pay securely, and bid from anywhere.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link href="/signup" className="bg-[#A5EC60] hover:bg-[#419310] text-[#0B1E26] hover:text-white px-8 py-4 rounded-full text-base font-bold transition-all duration-300 hover:shadow-xl hover:shadow-[#A5EC60]/20 hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto text-center">
            Start Bidding
          </Link>
          <button className="flex items-center justify-center gap-2.5 text-[#487070] hover:text-[#A5EC60] transition-colors duration-300 group px-4 py-4">
            <span className="w-10 h-10 rounded-full border-2 border-[#487070]/30 flex items-center justify-center group-hover:border-[#A5EC60] transition-all duration-300 group-hover:scale-110">
              <PlayIcon />
            </span>
            <span className="text-sm font-medium">How it works</span>
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {["A","B","C"].map(l => (
                <div key={l} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A5EC60] to-[#419310] border-2 border-[#0B1E26] flex items-center justify-center text-[#0B1E26] text-xs font-bold">
                  {l}
                </div>
              ))}
            </div>
            <span className="text-xs text-[#487070]">1,240+ bidders</span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-[#18333D]" />
          <div className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l2 4h4l-3 3 1 4-4-2.5L4 12l1-4-3-3h4l2-4z" fill="#A5EC60"/>
            </svg>
            <span className="text-xs text-[#487070]">4.9 rating</span>
          </div>
        </div>

        {/* Background image indicators */}
        <div className="flex items-center justify-center gap-2 mt-12">
          {backgrounds.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentBg(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                currentBg === i ? "w-8 bg-[#A5EC60]" : "w-1.5 bg-[#487070]/50 hover:bg-[#487070]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH BAR
// ═══════════════════════════════════════════════════════════════════

function SearchBar() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} className="py-16 sm:py-20 bg-[#0B1E26]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          Find your perfect <span className="text-[#A5EC60]">property</span>
        </h2>
        <p className={`text-[#487070] text-sm sm:text-base mb-8 sm:mb-10 transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          Browse verified real estate and vehicle listings from trusted auctioneers
        </p>

        <div className={`transition-all duration-700 delay-200 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex flex-col sm:flex-row items-center bg-[#18333D]/60 rounded-2xl sm:rounded-full p-2 border border-[#487070]/20 focus-within:border-[#A5EC60]/40 focus-within:ring-2 focus-within:ring-[#A5EC60]/10 transition-all duration-300 hover:shadow-lg hover:shadow-[#A5EC60]/5 gap-2 sm:gap-0">
            <div className="pl-4 pr-3 hidden sm:block">
              <SearchInputIcon />
            </div>
            <input
              type="text"
              placeholder="Search by location, property type, or auctioneer..."
              className="flex-1 bg-transparent py-3 sm:py-4 px-4 sm:px-2 text-white placeholder-[#487070] outline-none text-sm w-full"
            />
            <button className="bg-[#419310] hover:bg-[#A5EC60] text-white hover:text-[#0B1E26] px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-full text-sm font-bold transition-all duration-300 hover:shadow-lg hover:shadow-[#A5EC60]/20 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto">
              Search
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FEATURES
// ═══════════════════════════════════════════════════════════════════

function Features() {
  const { ref, inView } = useInView();

  const features = [
    {
      icon: <AuctionIcon />,
      title: "Real Estate Auctions",
      desc: "Browse and bid on residential, commercial, and agricultural properties from verified auctioneer agencies across Malawi.",
    },
    {
      icon: <BidIcon />,
      title: "Online Bidding",
      desc: "Participate in live auctions remotely with real-time bid updates. No need to travel — bid from your home or office.",
    },
    {
      icon: <ShieldIcon />,
      title: "Secure Payments",
      desc: "Pay bidding fees and security deposits safely through integrated PayChangu. Your funds are fully protected.",
    },
  ];

  return (
    <section ref={ref} className="py-16 sm:py-24 bg-[#0B1E26]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            Why Choose <span className="text-[#A5EC60]">TrustBid?</span>
          </h2>
          <p className={`text-[#487070] text-sm sm:text-base max-w-lg mx-auto transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            The first web-based auctioning platform designed specifically for auctioneer agencies in Malawi
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {features.map((f, i) => (
            <div key={f.title}
              className={`group p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#18333D]/40 border border-[#487070]/10 hover:border-[#A5EC60]/30 transition-all duration-500 hover:shadow-xl hover:shadow-[#A5EC60]/5 hover:-translate-y-2 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#0B1E26] border border-[#487070]/20 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 group-hover:border-[#A5EC60]/40 transition-all duration-300 shadow-lg">
                {f.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-[#A5EC60] transition-colors duration-300">{f.title}</h3>
              <p className="text-[#487070] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROPERTY CARD
// ═══════════════════════════════════════════════════════════════════

function PropertyCard({
  image, title, location, price, bids, timeLeft, delay, inView,
}: {
  image: string; title: string; location: string; price: string;
  bids: number; timeLeft: string; delay: number; inView: boolean;
}) {
  return (
    <div className={`group rounded-2xl sm:rounded-3xl overflow-hidden bg-[#18333D]/40 border border-[#487070]/10 hover:border-[#A5EC60]/20 transition-all duration-700 hover:shadow-2xl hover:shadow-[#A5EC60]/5 hover:-translate-y-3 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className="relative overflow-hidden">
        <img src={image} alt={title} className="w-full h-48 sm:h-56 object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1E26]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
          <span className="bg-[#A5EC60] text-[#0B1E26] text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
            Live Auction
          </span>
        </div>
        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
          <button className="bg-white text-[#0B1E26] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold hover:bg-[#A5EC60] transition-colors duration-300 flex items-center gap-2">
            View <ArrowRightIcon />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-1 text-[#487070] text-xs mb-2">
          <MapPinIcon /> {location}
        </div>
        <h3 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-[#A5EC60] transition-colors duration-300">{title}</h3>
        <div className="flex items-end justify-between mt-3 sm:mt-4">
          <div>
            <p className="text-xs text-[#487070] mb-0.5">Current Bid</p>
            <p className="text-lg sm:text-xl font-bold text-[#A5EC60]">{price}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#487070] mb-0.5">{bids} bids</p>
            <p className="text-xs font-medium text-orange-400 flex items-center gap-1">
              <ClockIcon /> {timeLeft}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FEATURED PROPERTIES
// ═══════════════════════════════════════════════════════════════════

function FeaturedProperties() {
  const { ref, inView } = useInView();

  const properties = [
    { image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop", title: "Luxury Villa in Area 43", location: "Lilongwe, Malawi", price: "MK 45M", bids: 12, timeLeft: "2h 15m" },
    { image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop", title: "Modern Apartment Complex", location: "Blantyre, Malawi", price: "MK 28.5M", bids: 8, timeLeft: "5h 30m" },
    { image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop", title: "Commercial Office Space", location: "Mzuzu, Malawi", price: "MK 62M", bids: 5, timeLeft: "1d 4h" },
  ];

  return (
    <section ref={ref} className="py-16 sm:py-24 bg-[#0B1E26]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              Featured <span className="text-[#A5EC60]">Auctions</span>
            </h2>
            <p className={`text-[#487070] text-sm sm:text-base transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              Hot properties available for bidding right now
            </p>
          </div>
          <button className={`flex items-center gap-2 text-[#A5EC60] font-bold text-sm hover:gap-3 transition-all duration-300 ${inView ? "opacity-100" : "opacity-0"}`}>
            View All <ArrowRightIcon />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {properties.map((p, i) => (
            <PropertyCard key={p.title} {...p} delay={200 + i * 150} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════

function Stats() {
  const { ref, inView } = useInView();
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const targets = [1240, 86, 340, 98];
  const suffixes = ["+", "", "+", "%"];
  const labels = ["Active Bidders", "Auctions Completed", "Properties Sold", "Success Rate"];

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounts(targets.map((t) => Math.round(t * eased)));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [inView]);

  return (
    <section ref={ref} className="py-16 sm:py-20 bg-[#0B1E26] border-y border-[#18333D]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {counts.map((count, i) => (
            <div key={labels[i]} className={`text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#A5EC60] mb-2">{count}{suffixes[i]}</div>
              <div className="text-xs sm:text-sm text-[#487070] font-medium">{labels[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CTA
// ═══════════════════════════════════════════════════════════════════

function CTA() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} className="py-20 sm:py-24 bg-gradient-to-br from-[#1C621B] to-[#419310] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#A5EC60]/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#A5EC60]/5 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <h2 className={`text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          Ready to Start Bidding?
        </h2>
        <p className={`text-[#A5EC60]/80 text-base sm:text-lg max-w-xl mx-auto mb-8 sm:mb-10 transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          Join thousands of bidders across Malawi. Register today and get access to exclusive auctions.
        </p>
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 transition-all duration-700 delay-200 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <Link href="/signup" className="bg-[#A5EC60] text-[#0B1E26] px-8 py-4 rounded-full text-base font-bold transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto text-center">
            Create Free Account
          </Link>
          <Link href="/login" className="border-2 border-white/20 text-white px-8 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:bg-white/10 hover:border-white/40 w-full sm:w-auto text-center">
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════

function Footer() {
  return (
    <footer className="bg-[#0B1E26] border-t border-[#18333D]/50 text-[#487070] py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-10 sm:mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <LogoIcon />
              <span className="text-xl font-bold text-white">TrustBid</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">
              Malawi&apos;s first web-based auctioning platform for real estate and vehicle agencies.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm">Platform</h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              {["Browse Auctions", "How It Works", "Pricing", "Success Stories"].map(item => (
                <li key={item}><a href="#" className="hover:text-[#A5EC60] transition-colors duration-300">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm">Company</h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              {["About Us", "For Auctioneers", "Careers", "Contact"].map(item => (
                <li key={item}><a href="#" className="hover:text-[#A5EC60] transition-colors duration-300">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm">Support</h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              {["Help Center", "Payment Guide", "Terms of Service", "Privacy Policy"].map(item => (
                <li key={item}><a href="#" className="hover:text-[#A5EC60] transition-colors duration-300">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#18333D]/50 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-center sm:text-left">&copy; 2026 TrustBid. A project by Asante Ngwira — CIS-PRJ-411.</p>
          <div className="flex items-center gap-3">
            {["T", "F", "I", "L"].map(letter => (
              <a key={letter} href="#" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#18333D]/50 flex items-center justify-center hover:bg-[#A5EC60] hover:text-[#0B1E26] transition-all duration-300 text-xs font-bold">
                {letter}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>TrustBid — Web-Based Real Estate & Vehicle Auction Platform</title>
        <meta name="description" content="Malawi's first web-based auctioning platform. Register remotely, pay securely via PayChangu, and bid on properties and vehicles from anywhere." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-[#0B1E26] font-sans antialiased">
        <Navbar />
        <Hero />
        <SearchBar />
        <Features />
        <FeaturedProperties />
        <Stats />
        <CTA />
        <Footer />
      </main>
    </>
  );
}