"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  CreditCard,
  Building2,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Loader2,
  X,
  AlertCircle,
  CheckCheck,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
//  PAYCHANGU ENVIRONMENT CONFIG — CHANGE THIS TO SWITCH ENVIRONMENTS
// ═══════════════════════════════════════════════════════════════════
const PAYCHANGU_ENV = "sandbox"; // ← "sandbox" or "production"

const PAYCHANGU_CONFIG = {
  sandbox: {
    baseUrl: "https://api.paychangu.com", // Use sandbox URL if different
    secretKey: process.env.NEXT_PUBLIC_PAYCHANGU_SANDBOX_KEY || "sandbox_secret_key_here",
  },
  production: {
    baseUrl: "https://api.paychangu.com",
    secretKey: process.env.NEXT_PUBLIC_PAYCHANGU_SECRET_KEY || "production_secret_key_here",
  },
};

const CONFIG = PAYCHANGU_CONFIG[PAYCHANGU_ENV];

const CALLBACK_URL = process.env.NEXT_PUBLIC_PAYCHANGU_CALLBACK_URL || "https://your-domain.com/api/paychangu/callback";
const RETURN_URL = process.env.NEXT_PUBLIC_PAYCHANGU_RETURN_URL || "https://your-domain.com/dashboard/payments";

// ═══════════════════════════════════════════════════════════════════
//  PAYCHANGU API CLIENT
// ═══════════════════════════════════════════════════════════════════
const paychanguApi = {
  get headers() {
    return {
      Authorization: `Bearer ${CONFIG.secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  },

  async initiatePayment(payload) {
    const res = await fetch(`${CONFIG.baseUrl}/payment`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async initiateDirectCharge(payload) {
    const res = await fetch(`${CONFIG.baseUrl}/mobile-money/charge`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async initiateBankTransfer(payload) {
    const res = await fetch(`${CONFIG.baseUrl}/bank-transfer`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async verifyTransaction(txRef) {
    const res = await fetch(`${CONFIG.baseUrl}/verify-payment/${txRef}`, {
      headers: this.headers,
    });
    return res.json();
  },
};

// ═══════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const PaymentCard = ({ title, icon: Icon, amount, description, status, statusColor, onPay, isLoading }) => (
  <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center group-hover:bg-[var(--color-primary)]/20 transition-colors">
          <Icon className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
          <p className="text-[10px] text-[var(--color-muted)]">{description}</p>
        </div>
      </div>
      <div className={`px-2.5 py-1 rounded-lg ${statusColor}`}>
        <span className="text-[10px] font-bold">{status}</span>
      </div>
    </div>
    <div className="flex items-end justify-between">
      <div>
        <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1">Balance</p>
        <p className="text-2xl font-bold text-[var(--color-text)]">{amount}</p>
      </div>
      <button
        onClick={onPay}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-xs font-bold hover:bg-[var(--color-primary)]/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        Pay Now
      </button>
    </div>
  </div>
);

const PaymentMethodCard = ({ name, icon: Icon, color, number, isDefault, onSelect, isSelected }) => (
  <div
    onClick={onSelect}
    className={`relative p-5 rounded-xl border cursor-pointer transition-all ${
      isSelected || isDefault
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
        : "border-[var(--color-border)] bg-[var(--color-input)] hover:border-[var(--color-primary)]/30"
    }`}
  >
    {(isSelected || isDefault) && (
      <div className="absolute top-3 right-3">
        <CheckCircle className="w-4 h-4 text-[var(--color-primary)]" />
      </div>
    )}
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--color-text)]">{name}</p>
        <p className="text-[10px] text-[var(--color-muted)]">{number}</p>
      </div>
    </div>
    {(isSelected || isDefault) && (
      <div className="mt-2 px-3 py-1 bg-[var(--color-primary)]/10 rounded-lg inline-flex">
        <span className="text-[10px] text-[var(--color-primary)] font-bold">
          {isSelected ? "Selected" : "Default Method"}
        </span>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
//  SANDBOX SIMULATION HELPER
// ═══════════════════════════════════════════════════════════════════
const simulatePayChangu = (method, payload) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate different responses based on method
      const responses = {
        tnm: {
          status: "success",
          message: "Payment prompt sent to TNM Mpamba",
          data: {
            tx_ref: payload.tx_ref,
            amount: payload.amount,
            currency: payload.currency,
            status: "pending",
            network: "TNM",
            phone: payload.mobile_number,
            checkout_url: null,
          },
        },
        airtel: {
          status: "success",
          message: "Payment prompt sent to Airtel Money",
          data: {
            tx_ref: payload.tx_ref,
            amount: payload.amount,
            currency: payload.currency,
            status: "pending",
            network: "AIRTEL",
            phone: payload.mobile_number,
            checkout_url: null,
          },
        },
        bank: {
          status: "success",
          message: "Bank transfer initiated",
          data: {
            tx_ref: payload.tx_ref,
            amount: payload.amount,
            currency: payload.currency,
            status: "pending",
            bank_code: payload.bank_code,
            account_number: payload.account_number,
            checkout_url: null,
          },
        },
        default: {
          status: "success",
          message: "Checkout link generated",
          data: {
            tx_ref: payload.tx_ref,
            amount: payload.amount,
            currency: payload.currency,
            status: "pending",
            link: "https://checkout.paychangu.com/sandbox/demo",
          },
        },
      };

      resolve(responses[method] || responses.default);
    }, 2000); // 2 second simulated delay
  });
};

// ═══════════════════════════════════════════════════════════════════
//  PAYCHANGU CHECKOUT MODAL
// ═══════════════════════════════════════════════════════════════════

const PayChanguModal = ({ isOpen, onClose, paymentType, amount, method, onSuccess }) => {
  const [step, setStep] = useState("form");
  const [error, setError] = useState(null);
  const [txRef, setTxRef] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    accountNumber: "",
    bankCode: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    const resetState = () => {
      setStep("form");
      setError(null);
      setTxRef(null);
      setFormData({ firstName: "", lastName: "", email: "", phone: "", accountNumber: "", bankCode: "" });
    };

    const timeoutId = setTimeout(resetState, 0);
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  if (!isOpen) return null;

  const generateTxRef = () => `BID265-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStep("processing");

    try {
      const ref = generateTxRef();
      setTxRef(ref);

      const numericAmount = parseFloat(amount.replace(/[^0-9]/g, ""));
      const basePayload = {
        amount: numericAmount,
        currency: "MWK",
        tx_ref: ref,
        callback_url: CALLBACK_URL,
        return_url: RETURN_URL,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        meta: { payment_type: paymentType },
      };

      let response;

      if (PAYCHANGU_ENV === "sandbox") {
        // ═══ SANDBOX MODE: Simulate API calls ═══
        if (method === "bank") {
          response = await simulatePayChangu("bank", {
            ...basePayload,
            account_number: formData.accountNumber,
            bank_code: formData.bankCode,
          });
        } else if (method === "tnm" || method === "airtel") {
          response = await simulatePayChangu(method, {
            ...basePayload,
            mobile_number: formData.phone,
          });
        } else {
          response = await simulatePayChangu("default", basePayload);
        }
      } else {
        // ═══ PRODUCTION MODE: Real API calls ═══
        if (method === "bank") {
          response = await paychanguApi.initiateBankTransfer({
            ...basePayload,
            account_number: formData.accountNumber,
            bank_code: formData.bankCode,
          });
        } else if (method === "tnm" || method === "airtel") {
          const network = method === "tnm" ? "TNM" : "AIRTEL";
          response = await paychanguApi.initiateDirectCharge({
            ...basePayload,
            mobile_number: formData.phone,
            network: network,
          });
        } else {
          response = await paychanguApi.initiatePayment({
            ...basePayload,
            customization: {
              title: `Bid265 - ${paymentType}`,
              description: `Payment for ${paymentType}`,
            },
          });
        }
      }

      if (response.status === "success" || response.data?.link) {
        if (response.data?.link) {
          window.location.href = response.data.link;
          return;
        }
        setStep("success");
        onSuccess?.(ref, response.data);
      } else {
        throw new Error(response.message || "Payment initiation failed");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const methodLabel = {
    tnm: "TNM Mpamba",
    airtel: "Airtel Money",
    bank: "Bank Transfer",
  }[method] || "PayChangu";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-card)] w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)]">Pay via {methodLabel}</h3>
              <p className="text-[10px] text-[var(--color-muted)]">{paymentType} — {amount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Environment Badge */}
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
              PAYCHANGU_ENV === "sandbox"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {PAYCHANGU_ENV}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-input)] transition-colors">
              <X className="w-4 h-4 text-[var(--color-muted)]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              {(method === "tnm" || method === "airtel") && (
                <div>
                  <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                    placeholder="+265 88X XXX XXX"
                  />
                  <p className="text-[10px] text-[var(--color-muted)] mt-1">
                    {PAYCHANGU_ENV === "sandbox"
                      ? "Sandbox mode — no real charge will be made"
                      : "You will receive a prompt on this number to authorize payment"}
                  </p>
                </div>
              )}

              {method === "bank" && (
                <>
                  <div>
                    <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">
                      Bank Code
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bankCode}
                      onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                      placeholder="e.g. CENTENARY"
                    />
                  </div>
                </>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--color-primary)]/90 transition-all active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4" />
                  {PAYCHANGU_ENV === "sandbox" ? `Simulate ${amount} Payment` : `Pay ${amount} via PayChangu`}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className="text-[10px] text-[var(--color-muted)]">
                  {PAYCHANGU_ENV === "sandbox" ? "🔒 Sandbox Mode — Test Only" : "🔒 Secured by PayChangu"}
                </span>
              </div>
            </form>
          )}

          {step === "processing" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">
                  {PAYCHANGU_ENV === "sandbox" ? "Simulating Payment..." : "Processing Payment..."}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  {PAYCHANGU_ENV === "sandbox"
                    ? "Sandbox mode — simulating PayChangu response"
                    : "Please wait while we connect to PayChangu"}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-input)] rounded-lg">
                <span className="text-[10px] text-[var(--color-muted)]">Ref:</span>
                <span className="text-[10px] font-mono text-[var(--color-text)]">{txRef}</span>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">
                  {PAYCHANGU_ENV === "sandbox" ? "Sandbox Payment Simulated!" : "Payment Initiated!"}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  {PAYCHANGU_ENV === "sandbox"
                    ? "In production, user would receive a phone prompt"
                    : "Check your phone for a payment prompt"}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                <span className="text-[10px] text-emerald-400 font-bold">Transaction Ref: {txRef}</span>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-bold hover:bg-[var(--color-primary)]/90 transition-all"
              >
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">Payment Failed</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">{error}</p>
              </div>
              <button
                onClick={() => setStep("form")}
                className="mt-4 px-6 py-2.5 bg-[var(--color-input)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg text-xs font-bold hover:border-[var(--color-primary)]/30 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAYMENT COMPONENT
// ═══════════════════════════════════════════════════════════════════

const Payment = () => {
  const [selectedMethod, setSelectedMethod] = useState("tnm");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPaymentType, setModalPaymentType] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalMethod, setModalMethod] = useState("");
  const [payLoading, setPayLoading] = useState({});

  const handlePay = (type, amount, methodOverride = null) => {
    const method = methodOverride || selectedMethod;
    setModalPaymentType(type);
    setModalAmount(amount);
    setModalMethod(method);
    setModalOpen(true);
  };

  const handlePaymentSuccess = (txRef, data) => {
    console.log("Payment successful:", txRef, data);
    // TODO: Call your Next.js API route to persist transaction
  };

  const paymentMethods = [
    {
      name: "TNM Mpamba",
      icon: Smartphone,
      color: "bg-yellow-500",
      number: "+265 88X XXX XXX",
      key: "tnm",
    },
    {
      name: "Airtel Money",
      icon: Smartphone,
      color: "bg-red-500",
      number: "+265 99X XXX XXX",
      key: "airtel",
    },
    {
      name: "Bank Transfer",
      icon: Building2,
      color: "bg-blue-600",
      number: "**** **** 4521",
      key: "bank",
    },
  ];

  const transactions = [
    { method: "TNM Mpamba", amount: "MK 5,000", type: "Bidding Fee", date: "Jul 12, 2026", status: "Completed", txRef: "BID265-1720785600-ABC123" },
    { method: "Airtel Money", amount: "MK 50,000", type: "Security Deposit", date: "Jul 10, 2026", status: "Completed", txRef: "BID265-1720609200-XYZ789" },
    { method: "Bank Transfer", amount: "MK 120,000", type: "Auction Payment", date: "Jul 8, 2026", status: "Pending", txRef: "BID265-1720432800-DEF456" },
  ];

  return (
    <div className="space-y-6">
      {/* Environment Banner (Sandbox only) */}
      {PAYCHANGU_ENV === "sandbox" && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-yellow-400">Sandbox Mode Active</p>
            <p className="text-xs text-yellow-400/70">
              Payments are simulated. Change PAYCHANGU_ENV to &quot;production&quot; to go live.
            </p>
          </div>
        </div>
      )}

      {/* Payment Overview Cards */}
      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">Payments & Deposits</h2>
            <p className="text-xs text-[var(--color-muted)]">
              Track bidding fees, security deposits, and PayChangu transactions
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PaymentCard
            title="Bidding Fees"
            icon={CreditCard}
            amount="MK 5,000"
            description="Non-refundable per auction"
            status="Required to bid"
            statusColor="bg-[var(--color-secondary)]/10"
            onPay={() => handlePay("Bidding Fee", "MK 5,000")}
            isLoading={payLoading["bidding"]}
          />
          <PaymentCard
            title="Security Deposit"
            icon={Wallet}
            amount="MK 50,000"
            description="Refundable after auction"
            status="Fully refundable"
            statusColor="bg-emerald-500/10 text-emerald-400"
            onPay={() => handlePay("Security Deposit", "MK 50,000")}
            isLoading={payLoading["deposit"]}
          />
          <PaymentCard
            title="Total Paid"
            icon={CheckCircle}
            amount="MK 55,000"
            description="Lifetime payments"
            status="PayChangu verified"
            statusColor="bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            onPay={() => handlePay("Total Payment", "MK 55,000")}
            isLoading={payLoading["total"]}
          />
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">Payment Methods</h2>
            <p className="text-xs text-[var(--color-muted)]">
              Select your preferred PayChangu payment method
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.key}
              {...method}
              isSelected={selectedMethod === method.key}
              onSelect={() => setSelectedMethod(method.key)}
            />
          ))}
        </div>

        <div className="p-6 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-input)]/30 text-center">
          <p className="text-sm text-[var(--color-muted)] font-medium">
            PayChangu Gateway Integration — {PAYCHANGU_ENV === "sandbox" ? "Sandbox" : "Production"}
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Secure payment processing for TNM Mpamba, Airtel Money & Bank Transfer
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">Recent Transactions</h2>
            <p className="text-xs text-[var(--color-muted)]">View your latest PayChangu payment activity</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
        </div>

        <div className="space-y-3">
          {transactions.map((tx, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  tx.method === "TNM Mpamba" ? "bg-yellow-500/20" :
                  tx.method === "Airtel Money" ? "bg-red-500/20" : "bg-blue-600/20"
                }`}>
                  {tx.method === "TNM Mpamba" && <Smartphone className="w-4 h-4 text-yellow-500" />}
                  {tx.method === "Airtel Money" && <Smartphone className="w-4 h-4 text-red-500" />}
                  {tx.method === "Bank Transfer" && <Building2 className="w-4 h-4 text-blue-500" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text)]">{tx.type}</p>
                  <p className="text-[10px] text-[var(--color-muted)]">{tx.method} • {tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--color-text)]">{tx.amount}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <span className={`text-[10px] font-bold ${
                    tx.status === "Completed" ? "text-emerald-400" : "text-yellow-400"
                  }`}>
                    {tx.status}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)] font-mono">{tx.txRef}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PayChangu Checkout Modal */}
      <PayChanguModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        paymentType={modalPaymentType}
        amount={modalAmount}
        method={modalMethod}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default Payment;