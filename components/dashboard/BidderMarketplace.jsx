"use client";

import React, { useEffect, useState } from "react";
import {
  Package,
  Home,
  Search,
  MapPin,
  X,
  Tag,
  User,
  Clock,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  Mail,
  Receipt,
} from "lucide-react";
import { formatDate } from "@/lib/payments";
import { purchaseListing } from "@/app/actions/purchase";

/**
 * 🛍 BIDDER MARKETPLACE (Daily Sales & Properties)
 *
 * The nav bar owns section switching — there is no in-card tab switcher.
 * Each section has ONE search bar. Both sections are for outright purchase:
 * a completed purchase emails the buyer a receipt as proof of purchase.
 */
export default function BidderMarketplace({ initialTab = "daily-sales" }) {
  const activeTab = initialTab === "properties" ? "properties" : "daily-sales";
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Purchase flow
  const [purchaseTarget, setPurchaseTarget] = useState(null);
  const [purchaseState, setPurchaseState] = useState("idle"); // idle | processing | done
  const [purchaseError, setPurchaseError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchListings() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ tab: activeTab });
        if (searchQuery.trim()) params.set("q", searchQuery.trim());

        const res = await fetch(`/api/marketplace?${params.toString()}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Failed to load listings");
        if (!cancelled) setItems(json.items || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const debounce = setTimeout(fetchListings, 250);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [activeTab, searchQuery]);

  const formatMoney = (value) =>
    value === null || value === undefined || isNaN(Number(value))
      ? "—"
      : `MK ${Number(value).toLocaleString()}`;

  const formatListingDate = (iso) => (iso ? `Listed ${formatDate(iso)}` : "");

  const openPurchase = (item) => {
    setPurchaseTarget(item);
    setPurchaseState("idle");
    setPurchaseError(null);
    setReceipt(null);
  };

  const closePurchase = () => {
    if (purchaseState === "processing") return;
    setPurchaseTarget(null);
    setPurchaseState("idle");
    setPurchaseError(null);
    setReceipt(null);
  };

  const confirmPurchase = async () => {
    if (!purchaseTarget) return;
    try {
      setPurchaseState("processing");
      setPurchaseError(null);
      const res = await purchaseListing(purchaseTarget.kind, purchaseTarget.id);
      if (!res.success) throw new Error(res.error);

      setReceipt(res.receipt);
      setPurchaseState("done");
      // Drop the sold item from the current view.
      setItems((prev) => prev.filter((it) => !(it.kind === purchaseTarget.kind && it.id === purchaseTarget.id)));
    } catch (err) {
      setPurchaseError(err.message || "Could not complete the purchase.");
      setPurchaseState("idle");
    }
  };

  const isProperty = activeTab === "properties";

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] text-[var(--color-bg)] rounded-2xl p-5 sm:p-6 shadow-lg shadow-[var(--color-primary)]/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
              {isProperty ? (
                <><Home className="w-5 h-5" /> Properties</>
              ) : (
                <><ShoppingBag className="w-5 h-5" /> Daily Sales</>
              )}
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--color-bg)]/70 max-w-xl leading-relaxed">
              {isProperty
                ? "Land and buildings from registered auctioneers — listed for sale, not for auction. Buy directly and get your receipt by email."
                : "Goods uploaded for quick daily sales by every auctioneer on the system. Buy what you need and get your receipt by email."}
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-5 py-3 shrink-0 self-start sm:self-center">
            <span className="block text-xl sm:text-2xl font-black leading-none text-center">{items.length}</span>
            <span className="text-[9px] uppercase tracking-wider font-bold mt-1 block opacity-70 text-center">Listings</span>
          </div>
        </div>
      </div>

      {/* Single search bar — the nav bar owns section switching */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="text"
          placeholder={
            isProperty
              ? "Search properties by name, type or location — e.g. Lilongwe, plot, villa..."
              : "Search for goods across all auctioneers — e.g. vehicle, electronics..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 animate-pulse">
              <div className="h-40 bg-[var(--color-input)] rounded-xl mb-4" />
              <div className="h-4 bg-[var(--color-input)] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[var(--color-input)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-[var(--color-card)] border border-red-500/20 rounded-2xl p-8 text-center">
          <p className="text-sm text-red-400 font-medium">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--color-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-12 text-center">
          {isProperty ? (
            <Home className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-4 opacity-50" />
          ) : (
            <Package className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-4 opacity-50" />
          )}
          <p className="text-sm text-[var(--color-muted)] font-medium">
            {searchQuery
              ? "No listings match your search. Try different keywords."
              : "No listings published yet. Check back soon!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm flex flex-col group hover:border-[var(--color-primary)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--color-primary)]/5"
            >
              <div className="relative h-44 w-full overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-card)] to-[var(--color-input)]">
                    {isProperty ? (
                      <Home className="w-10 h-10 text-[var(--color-muted)] opacity-30" />
                    ) : (
                      <Package className="w-10 h-10 text-[var(--color-muted)] opacity-30" />
                    )}
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[var(--color-secondary)] text-white">
                    {item.category || (isProperty ? "PROPERTY" : "GOOD")}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="bg-[var(--color-bg)]/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-[var(--color-border)]">
                    <Clock className="w-3 h-3 text-[var(--color-primary)]" />
                    {formatListingDate(item.createdAt)}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col gap-2">
                <h3 className="text-sm font-bold text-[var(--color-text)] line-clamp-1 group-hover:text-[var(--color-primary)] transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-[var(--color-muted)] line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
                  <MapPin className="w-3 h-3 text-[var(--color-primary)]" />
                  {item.location}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-[var(--color-muted)] mt-auto">
                  <User className="w-3 h-3" />
                  {item.auctioneerName}
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-[var(--color-border)] mt-1">
                  <div>
                    <p className="text-[10px] text-[var(--color-muted)] mb-0.5">Sale Price</p>
                    <p className="text-base font-extrabold text-[var(--color-primary)]">
                      {formatMoney(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => openPurchase(item)}
                    disabled={item.price === null}
                    className="flex items-center gap-1 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Tag className="w-3.5 h-3.5" /> Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ PURCHASE / RECEIPT MODAL ═══════════ */}
      {purchaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-card)] w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                  {purchaseState === "done" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Receipt className="w-4 h-4 text-[var(--color-primary)]" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">
                    {purchaseState === "done" ? "Purchase Complete" : "Confirm Purchase"}
                  </h3>
                  <p className="text-[10px] text-[var(--color-muted)]">
                    {purchaseState === "done"
                      ? "Your receipt is your proof of purchase"
                      : purchaseTarget.kind === "PROPERTY"
                      ? "Property purchase"
                      : "Daily sale purchase"}
                  </p>
                </div>
              </div>
              <button
                onClick={closePurchase}
                className="p-1.5 rounded-lg hover:bg-[var(--color-input)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--color-muted)]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {purchaseState !== "done" ? (
                <>
                  <div className="bg-[var(--color-input)] rounded-xl border border-[var(--color-border)] p-4 space-y-2">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[var(--color-muted)]">Item</span>
                      <span className="font-bold text-[var(--color-text)] text-right">{purchaseTarget.title}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[var(--color-muted)]">Location</span>
                      <span className="font-bold text-[var(--color-text)] text-right">{purchaseTarget.location}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[var(--color-muted)]">Seller</span>
                      <span className="font-bold text-[var(--color-text)] text-right">{purchaseTarget.auctioneerName}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-sm pt-2 border-t border-[var(--color-border)]">
                      <span className="font-bold text-[var(--color-text)]">Total</span>
                      <span className="font-extrabold text-[var(--color-primary)]">{formatMoney(purchaseTarget.price)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-[var(--color-secondary)]/10 border border-[var(--color-primary)]/20 rounded-xl">
                    <Mail className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                      After payment your receipt will be emailed to you with every detail of this
                      purchase — it serves as your proof of purchase.
                    </p>
                  </div>

                  {purchaseError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-400 font-medium">{purchaseError}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={confirmPurchase}
                    disabled={purchaseState === "processing"}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    {purchaseState === "processing" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Tag className="w-4 h-4" /> Pay {formatMoney(purchaseTarget.price)}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[var(--color-muted)]">Receipt number</span>
                      <span className="font-bold text-emerald-400">{receipt?.reference}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[var(--color-muted)]">Item</span>
                      <span className="font-bold text-[var(--color-text)] text-right">{receipt?.title}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[var(--color-muted)]">Date</span>
                      <span className="font-bold text-[var(--color-text)]">
                        {receipt?.purchasedAt ? formatDate(receipt.purchasedAt) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 text-sm pt-2 border-t border-emerald-500/20">
                      <span className="font-bold text-[var(--color-text)]">Total paid</span>
                      <span className="font-extrabold text-emerald-400">{formatMoney(receipt?.amount)}</span>
                    </div>
                  </div>

                  {receipt?.emailed ? (
                    <div className="flex items-start gap-2 p-3 bg-[var(--color-secondary)]/10 border border-[var(--color-primary)]/20 rounded-xl">
                      <Mail className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                        Receipt emailed to <span className="font-bold text-[var(--color-text)]">{receipt?.buyerEmail}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                        Your receipt is saved as <span className="font-bold text-[var(--color-text)]">{receipt?.reference}</span>.
                        Email delivery is pending configuration (RESEND_API_KEY), so no email was sent yet.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={closePurchase}
                    className="w-full px-4 py-3 bg-[var(--color-input)] border border-[var(--color-border)] rounded-xl text-sm font-bold text-[var(--color-text)] hover:border-[var(--color-primary)]/40 transition-all"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
