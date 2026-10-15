"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign, Loader2, RefreshCw } from "lucide-react";

export default function AdminRefundManager() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRefundId, setProcessingRefundId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auction-refunds");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load refunds.");
      setRefunds(result.refunds || []);
    } catch (loadError) {
      setError(loadError.message || "Could not load refunds.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadRefunds, 0);
    return () => clearTimeout(timer);
  }, [loadRefunds]);

  const handleProcessRefund = async (refundId) => {
    const gatewayReference = window.prompt("Enter the PayChangu payout / refund reference after processing the refund.");
    if (!gatewayReference?.trim()) return;
    setProcessingRefundId(refundId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/auction-refunds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundId, gatewayReference: gatewayReference.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not record the refund.");
      setNotice(result.emailWarning || "Refund marked as paid and the bidder was notified.");
      await loadRefunds();
    } catch (processError) {
      setError(processError.message || "Could not record the refund.");
    } finally {
      setProcessingRefundId(null);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--color-text)]">
            <CircleDollarSign className="h-5 w-5 text-[var(--color-primary)]" /> Bidding deposit refunds
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Process refunds through PayChangu first, then record each payout reference here.
          </p>
        </div>
        <button type="button" onClick={loadRefunds} disabled={loading} aria-label="Refresh refunds" className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400" role="alert">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400" role="status">{notice}</p>}

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" /></div>
        ) : refunds.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-muted)]">No deposit refunds have been recorded.</p>
        ) : (
          <div className="space-y-3">
            {refunds.map((refund) => (
              <article key={refund.id} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm">
                  <strong className="text-[var(--color-text)]">{refund.bidderName} · MWK {Number(refund.amount).toLocaleString()}</strong>
                  <p className="text-xs text-[var(--color-muted)]">{refund.bidderEmail} · {refund.auctionTitle}</p>
                  <p className="text-xs text-[var(--color-muted)]">{refund.reason.replaceAll("_", " ")} · {refund.status}{refund.gatewayReference ? ` · ${refund.gatewayReference}` : ""}</p>
                </div>
                {refund.status === "PENDING" && (
                  <button type="button" onClick={() => handleProcessRefund(refund.id)} disabled={processingRefundId === refund.id} className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                    {processingRefundId === refund.id ? "Saving…" : "Record completed refund"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
