"use server";

import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";
import { sendPurchaseReceipt } from "@/lib/email";

/**
 * 🧾 DIRECT PURCHASE ENGINE (Daily Sales & Properties)
 *
 * Properties and daily-sale goods are bought outright — they are not auctioned.
 * On success the buyer's Payment ledger is written and a receipt is emailed to
 * their address as proof of purchase.
 */

function generateReference(prefix) {
  return `RCPT-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function serializeReceipt(receipt) {
  return {
    reference: receipt.reference,
    kind: receipt.kind,
    title: receipt.title,
    category: receipt.category,
    location: receipt.location,
    quantity: receipt.quantity,
    amount: receipt.amount,
    buyerName: receipt.buyerName,
    buyerEmail: receipt.buyerEmail,
    auctioneerName: receipt.auctioneerName,
    purchasedAt: receipt.purchasedAt instanceof Date ? receipt.purchasedAt.toISOString() : receipt.purchasedAt,
  };
}

async function purchaseDailySale(saleId, session) {
  const saleIdNum = Number(saleId);
  if (isNaN(saleIdNum)) throw new Error("Invalid daily sale listing.");

  return prisma.$transaction(async (tx) => {
    // Guarded decrement — two buyers can never take the same last unit.
    const updated = await tx.dailySale.updateMany({
      where: { id: saleIdNum, isAvailable: true, stockCount: { gt: 0 } },
      data: { stockCount: { decrement: 1 } },
    });
    if (updated.count === 0) {
      throw new Error("This item is sold out.");
    }

    const sale = await tx.dailySale.findUnique({
      where: { id: saleIdNum },
      include: {
        asset: {
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            auctionItems: { include: { images: { where: { isPrimary: true }, take: 1 } } },
          },
        },
      },
    });
    if (!sale) throw new Error("Listing not found.");
    if (sale.asset.createdById === Number(session.user.id)) {
      throw new Error("You cannot purchase your own listing.");
    }

    const amount = Number(sale.price);
    const reference = generateReference("SALE");

    if (sale.stockCount <= 0) {
      await tx.dailySale.update({ where: { id: sale.id }, data: { isAvailable: false } });
      await tx.asset.update({ where: { id: sale.assetId }, data: { isSold: true } });
    }

    await tx.payment.create({
      data: {
        userId: Number(session.user.id),
        amount,
        reference,
        gatewayStatus: "completed",
        purpose: "DAILY_SALE_PURCHASE",
      },
    });

    return {
      reference,
      kind: "Daily Sale",
      title: sale.asset.title,
      category: sale.asset.category,
      location: sale.asset.location,
      quantity: 1,
      amount,
      buyerName: session.user.name || "Valued Buyer",
      buyerEmail: session.user.email,
      auctioneerName: sale.asset.createdBy?.name || "Verified Auctioneer",
      purchasedAt: new Date(),
    };
  });
}

async function purchaseProperty(assetId, session) {
  const assetIdNum = Number(assetId);
  if (isNaN(assetIdNum)) throw new Error("Invalid property listing.");

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id: assetIdNum },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        auctionItems: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { reservePrice: true, startingBid: true },
        },
      },
    });
    if (!asset || asset.salesType !== "PROPERTY") throw new Error("Property listing not found.");
    if (asset.createdById === Number(session.user.id)) {
      throw new Error("You cannot purchase your own listing.");
    }

    // Same price source as the marketplace card (salePrice, else reserve/starting).
    const legacyLot = asset.auctionItems?.[0] || null;
    const price = asset.salePrice
      ? Number(asset.salePrice)
      : legacyLot
      ? Number(legacyLot.reservePrice || legacyLot.startingBid)
      : 0;
    if (price <= 0) throw new Error("This property has no sale price set.");

    // Guarded claim — only one buyer can flip isSold.
    const claimed = await tx.asset.updateMany({
      where: { id: asset.id, salesType: "PROPERTY", isSold: false },
      data: { isSold: true },
    });
    if (claimed.count === 0) throw new Error("This property has already been sold.");

    const reference = generateReference("PROP");

    await tx.payment.create({
      data: {
        userId: Number(session.user.id),
        amount: price,
        reference,
        gatewayStatus: "completed",
        purpose: "PROPERTY_PURCHASE",
      },
    });

    return {
      reference,
      kind: "Property",
      title: asset.title,
      category: asset.category,
      location: asset.location,
      quantity: 1,
      amount: price,
      buyerName: session.user.name || "Valued Buyer",
      buyerEmail: session.user.email,
      auctioneerName: asset.createdBy?.name || "Verified Auctioneer",
      purchasedAt: new Date(),
    };
  });
}

/**
 * Purchase a listing outright. kind: "DAILY_SALE" | "PROPERTY"
 * Returns the receipt payload plus the email delivery status.
 */
export async function purchaseListing(kind, listingId) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Please sign in to complete your purchase." };
    }
    if (session.user.role === "AUCTIONEER" || session.user.role === "ADMIN") {
      return { success: false, error: "Auctioneer accounts cannot purchase listings." };
    }

    const normalized = kind === "PROPERTY" ? "PROPERTY" : "DAILY_SALE";
    const receipt =
      normalized === "PROPERTY"
        ? await purchaseProperty(listingId, session)
        : await purchaseDailySale(listingId, session);

    // Email the receipt — delivery problems never undo a completed purchase.
    let email = { sent: false, reason: "Receipt email not attempted." };
    try {
      email = await sendPurchaseReceipt(receipt);
    } catch (err) {
      email = { sent: false, reason: err.message || "Email delivery failed." };
    }

    return {
      success: true,
      receipt: serializeReceipt(receipt),
      emailed: Boolean(email.sent),
      emailReason: email.sent ? null : email.reason || null,
    };
  } catch (error) {
    console.error("❌ Purchase failure:", error);
    return { success: false, error: error.message || "Failed to complete the purchase." };
  }
}
