"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Wallet,
  ShoppingBag,
  Home,
  Gavel,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { fetchPaymentBundle, formatAmount, formatDate } from "@/lib/payments";

/**
 * 📊 AUCTIONEER SALES REPORTS
 *
 * Document requirement: a dedicated report tab giving the auctioneer a sales
 * report of all daily sales and property sales, plus the bidding fees and
 * entry fees collected from their auctions.
 */

const PURPOSE_LABELS = {
  DAILY_SALE_RECEIVED: "Daily Sale",
  PROPERTY_RECEIVED: "Property Sale",
  PROPERTY_LEASE_RECEIVED: "Property Lease",
};

const REASONS = Object.keys(PURPOSE_LABELS);

export default function AuctioneerReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [received, setReceived] = useState([]);
  const [feePayments, setFeePayments] = useState([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchPaymentBundle();
      setReceived(
        (bundle.payments || []).filter((p) => p.purpose && REASONS.includes(p.purpose))
      );
      setFeePayments(bundle.accessPayments || []);
    } catch (err) {
      setError(err.message || "Failed to load the sales report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const sum = (list) => list.reduce((total, item) => total + (Number(item.amount) || 0), 0);

  const byReason = REASONS.map((reason) => {
    const rows = received.filter((p) => p.purpose === reason);
    return { reason, label: PURPOSE_LABELS[reason], count: rows.length, total: sum(rows) };
  });

  const paidFees = feePayments.filter((p) => p.status === "PAID");
  const biddingTotal = sum(paidFees.filter((p) => p.feeType !== "SECURITY_DEPOSIT"));
  const entryTotal = sum(paidFees.filter((p) => p.feeType === "SECURITY_DEPOSIT"));

  const grandTotal = sum(received) + biddingTotal + entryTotal;

  const cards = [
    {
      label: "Total Received",
      value: formatAmount(grandTotal),
      icon: Wallet,
      accent: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary)]/10",
    },
    {
      label: "Sales & Leases",
      value: formatAmount(sum(received)),
      icon: TrendingUp,
      accent: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Bidding Fees",
      value: formatAmount(biddingTotal),
      icon: Gavel,
      accent: "text-[var(--color-secondary)]",
      bg: "bg-[var(--color-secondary)]/10",
    },
    {
      label: "Entry Fees",
      value: formatAmount(entryTotal),
      icon: Wallet,
      accent: "text-blue-400",
      bg: "bg-blue-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--color-card)] border border-red-500/20 rounded-2xl p-8 text-center">
        <p className="text-sm text-red-400 font-medium">{error}</p>
        <button
          onClick={loadReport}
          className="mt-4 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] text-[var(--color-bg)] rounded-2xl p-5 sm:p-6 shadow-lg shadow-[var(--color-primary)]/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Sales Reports
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--color-bg)]/70 max-w-xl leading-relaxed">
              Your sales report across daily sales, property sales and leases, plus the bidding
              fees and entry fees bidders paid to join your auctions.
            </p>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-2.5 text-[11px] font-bold flex items-center gap-2 shrink-0 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm"
          >
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-4 h-4 ${card.accent}`} />
            </div>
            <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider">
              {card.label}
            </p>
            <p className={`text-lg font-extrabold ${card.accent} mt-1`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Sales breakdown */}
      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text)]">Sales Breakdown</h3>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Completed purchases on your listings, grouped by sale type
            </p>
          </div>
          <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {byReason.map((row) => (
            <div
              key={row.reason}
              className="bg-[var(--color-input)] border border-[var(--color-border)] rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {row.reason === "DAILY_SALE_RECEIVED" ? (
                  <ShoppingBag className="w-4 h-4 text-[var(--color-primary)]" />
                ) : (
                  <Home className="w-4 h-4 text-[var(--color-primary)]" />
                )}
                <span className="text-xs font-bold text-[var(--color-text)]">{row.label}</span>
              </div>
              <p className="text-xl font-extrabold text-[var(--color-text)]">
                {formatAmount(row.total)}
              </p>
              <p className="text-[10px] text-[var(--color-muted)] mt-1">
                {row.count} completed {row.count === 1 ? "payment" : "payments"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed sales ledger */}
      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--color-text)]">Sales &amp; Lease Ledger</h3>
          <Home className="w-5 h-5 text-[var(--color-primary)]" />
        </div>

        {received.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl">
            <Wallet className="w-8 h-8 text-[var(--color-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-muted)]">No sales recorded yet</p>
            <p className="text-[10px] text-[var(--color-muted)] mt-1">
              Sales appear here as soon as buyers purchase your listings
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-[var(--color-input)]/60 border-b border-[var(--color-border)]">
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Type</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Reference</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Date</th>
                  <th className="text-right px-3 py-2.5 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {received.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--color-input)]/30 transition-colors">
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {PURPOSE_LABELS[row.purpose] || row.purpose}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] font-mono text-[var(--color-muted)]">
                      {row.reference}
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-[var(--color-text)] whitespace-nowrap">
                      {formatAmount(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
