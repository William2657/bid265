// ═══════════════════════════════════════════════════════════════════
//  RECEIPT EMAIL DELIVERY — Resend transactional API (single REST call)
//  Requires the RESEND_API_KEY environment variable.
// ═══════════════════════════════════════════════════════════════════

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount) {
  const num = Number(amount || 0);
  return `MK ${num.toLocaleString()}`;
}

/**
 * Build the proof-of-purchase receipt markup.
 * receipt: { reference, kind, title, category, location, quantity, amount,
 *            buyerName, buyerEmail, auctioneerName, purchasedAt }
 */
export function buildReceiptHtml(receipt) {
  const purchasedAt = new Date(receipt.purchasedAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const quantityRow = receipt.quantity
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Quantity</td>
       <td style="padding:8px 0;text-align:right;font-weight:600;color:#0B1E26;font-size:13px;">${escapeHtml(receipt.quantity)}</td></tr>`
    : "";

  return `
  <div style="font-family:Inter,Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
    <div style="background:#0B1E26;padding:24px 28px;">
      <div style="color:#A5EC60;font-size:20px;font-weight:800;letter-spacing:0.5px;">TrustBid</div>
      <div style="color:#9ca3af;font-size:12px;margin-top:4px;text-transform:uppercase;letter-spacing:1.5px;">Purchase Receipt &amp; Proof of Purchase</div>
    </div>
    <div style="padding:28px;">
      <p style="font-size:15px;color:#0B1E26;margin:0 0 4px;">Hello ${escapeHtml(receipt.buyerName)},</p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 20px;">
        Thank you for your purchase on TrustBid. Your receipt is below — keep this email as your proof of purchase.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin-bottom:18px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Receipt number</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;color:#419310;font-size:13px;">${escapeHtml(receipt.reference)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Date</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#0B1E26;font-size:13px;">${escapeHtml(purchasedAt)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Item</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#0B1E26;font-size:13px;">${escapeHtml(receipt.title)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Type</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#0B1E26;font-size:13px;">${escapeHtml(receipt.kind)}${receipt.category ? ` · ${escapeHtml(receipt.category)}` : ""}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Location</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#0B1E26;font-size:13px;">${escapeHtml(receipt.location || "—")}</td></tr>
          ${quantityRow}
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Sold by</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#0B1E26;font-size:13px;">${escapeHtml(receipt.auctioneerName || "Verified Auctioneer")}</td></tr>
          <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:14px 0 4px;color:#0B1E26;font-size:14px;font-weight:700;">Total paid</td>
              <td style="padding:14px 0 4px;text-align:right;font-size:20px;font-weight:800;color:#419310;">${escapeHtml(formatMoney(receipt.amount))}</td></tr>
        </table>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;margin-bottom:18px;">
        <p style="margin:0;font-size:13px;color:#166534;">
          <strong>Paid by:</strong> ${escapeHtml(receipt.buyerName)} &lt;${escapeHtml(receipt.buyerEmail)}&gt;<br />
          This receipt confirms that payment was received in full for the item above.
        </p>
      </div>

      <p style="font-size:12px;color:#9ca3af;margin:0;">
        TrustBid Auction Platform · Questions about this purchase? Reply to this email with your receipt number.
      </p>
    </div>
  </div>`;
}

export function buildReceiptText(receipt) {
  const purchasedAt = new Date(receipt.purchasedAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  return [
    "TRUSTBID — PURCHASE RECEIPT (PROOF OF PURCHASE)",
    `Receipt number: ${receipt.reference}`,
    `Date: ${purchasedAt}`,
    `Buyer: ${receipt.buyerName} <${receipt.buyerEmail}>`,
    `Item: ${receipt.title}`,
    `Type: ${receipt.kind}${receipt.category ? ` · ${receipt.category}` : ""}`,
    `Location: ${receipt.location || "—"}`,
    receipt.quantity ? `Quantity: ${receipt.quantity}` : null,
    `Sold by: ${receipt.auctioneerName || "Verified Auctioneer"}`,
    `Total paid: ${formatMoney(receipt.amount)}`,
  ].filter(Boolean).join("\n");
}

/**
 * Send an email through Resend.
 * Returns { sent: boolean, reason?: string } — never throws, so a delivery
 * problem can never roll back an already-completed purchase.
 */
export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured." };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RECEIPT_FROM_EMAIL || "TrustBid Receipts <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { sent: false, reason: data?.message || `Resend responded with ${res.status}.` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message || "Email delivery failed." };
  }
}

/**
 * Email a purchase receipt to the buyer.
 */
export async function sendPurchaseReceipt(receipt) {
  const html = buildReceiptHtml(receipt);
  const text = buildReceiptText(receipt);
  return sendEmail({
    to: receipt.buyerEmail,
    subject: `Your TrustBid receipt ${receipt.reference} — ${receipt.title}`,
    html,
    text,
  });
}
