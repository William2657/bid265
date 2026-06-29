"use client";

import React, { useState } from "react";
import { Mail, Lock, User, Phone, Building2, Gavel } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const [role, setRole] = useState("BIDDER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role })
      });

      if (response.ok) {
        window.location.href = "/login";
      } else {
        const err = await response.json();
        setError(err.message || "Registration failed");
      }
    } catch (error) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-[var(--color-card)] rounded-2xl shadow-2xl shadow-[var(--color-primary)]/5 border border-[var(--color-border)] p-6 sm:p-8">

        {/* Branding & Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="var(--color-primary)" strokeWidth="2.5"/>
              <path d="M10 16L14 20L22 12" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xl font-bold text-[var(--color-text)] tracking-tight">TrustBid</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Create Account</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Join to start bidding on verified properties</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Role Selection Toggle */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6 p-1 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setRole("BIDDER")}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 ${
              role === "BIDDER"
                ? "bg-[var(--color-secondary)] text-white shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Gavel className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            I am a Bidder
          </button>
          <button
            type="button"
            onClick={() => setRole("AUCTIONEER")}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 ${
              role === "AUCTIONEER"
                ? "bg-[var(--color-secondary)] text-white shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Auctioneer
          </button>
        </div>

        {/* Input Form */}
        <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--color-muted)] absolute left-3 top-3" />
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe" 
                className="w-full bg-[var(--color-input)] border border-[var(--color-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-card)] transition-colors"
                required 
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--color-muted)] absolute left-3 top-3" />
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="name@example.com" 
                className="w-full bg-[var(--color-input)] border border-[var(--color-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-card)] transition-colors"
                required 
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[var(--color-muted)] absolute left-3 top-3" />
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+265 888 123 456" 
                className="w-full bg-[var(--color-input)] border border-[var(--color-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-card)] transition-colors"
                required 
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--color-muted)] absolute left-3 top-3" />
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••" 
                className="w-full bg-[var(--color-input)] border border-[var(--color-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-card)] transition-colors"
                required 
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-3 shadow-lg shadow-[var(--color-primary)]/20 transition-all duration-300 mt-2 hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? "Creating Account..." : `Create ${role === "BIDDER" ? "Bidder" : "Auctioneer"} Account`}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border)]"></div>
          </div>
          <span className="relative bg-[var(--color-card)] px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">
            Or register with
          </span>
        </div>

        {/* Google Auth */}
        <button 
          type="button" 
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-3 border border-[var(--color-border)] hover:bg-[var(--color-input)] text-[var(--color-text)] font-semibold text-sm rounded-xl py-2.5 transition-all duration-300"
        >
          <Image 
            src="/google.svg" 
            alt="Google Logo" 
            width={18} 
            height={18} 
            priority
          />
          Continue with Google
        </button>

        <p className="text-center text-sm text-[var(--color-muted)] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline">
            Log in
          </Link>
        </p>

      </div>
    </div>
  );
}