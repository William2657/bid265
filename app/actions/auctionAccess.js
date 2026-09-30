"use server";

import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";

/**
 * 🎟 LIVE AUCTION ACCESS GATE
 *
 * Document flow: a bidder who wants to join a live auction must:
 *   1. Pay the BIDDING FEE first.
 *   2. On confirmation, pay the SECURITY DEPOSIT (guarantee they honour their bid).
 *   3. Only after BOTH payments are confirmed does the system direct them to the auction room.
 */

/**
 * Get the bidder's payment progress for a live auction lot.
 * Returns which step of the fee sequence is next (or ACCESS_GRANTED when done).
 */
export async function getAuctionAccessStatus(auctionItemId) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    if (isNaN(cleanId)) {
      return { success: false, error: "Invalid auction item ID." };
    }

    const item = await prisma.auctionItem.findUnique({
      where: { id: cleanId },
      select: {
        id: true,
        status: true,
        biddingFee: true,
        depositAmount: true,
        liveRoomId: true,
        startingBid: true,
        asset: { select: { title: true, location: true } },
      },
    });

    if (!item) {
      return { success: false, error: "Auction item not found." };
    }

    const payments = await prisma.auctionAccessPayment.findMany({
      where: {
        userId: Number(session.user.id),
        auctionItemId: cleanId,
      },
    });

    const biddingFeePayment = payments.find((p) => p.feeType === "BIDDING_FEE");
    const depositPayment = payments.find((p) => p.feeType === "SECURITY_DEPOSIT");

    const biddingFeePaid = biddingFeePayment?.status === "PAID";
    const depositPaid = depositPayment?.status === "PAID";

    let nextStep;
    if (!biddingFeePaid) {
      nextStep = "BIDDING_FEE";
    } else if (!depositPaid) {
      nextStep = "SECURITY_DEPOSIT";
    } else {
      nextStep = "ACCESS_GRANTED";
    }

    return {
      success: true,
      data: {
        auctionItemId: item.id,
        status: item.status,
        liveRoomId: item.liveRoomId,
        itemTitle: item.asset?.title || "Auction Lot",
        location: item.asset?.location || "",
        startingBid: Number(item.startingBid),
        biddingFee: Number(item.biddingFee),
        depositAmount: Number(item.depositAmount),
        biddingFeePaid,
        depositPaid,
        nextStep,
        pendingBiddingFeeRef: biddingFeePayment?.status === "PENDING" ? biddingFeePayment.paymentRef : null,
        pendingDepositRef: depositPayment?.status === "PENDING" ? depositPayment.paymentRef : null,
      },
    };
  } catch (error) {
    console.error("❌ Access status failure:", error);
    return { success: false, error: error.message || "Failed to read auction access status." };
  }
}

/**
 * Step 1 — begin the BIDDING FEE payment for a live auction lot.
 * Creates (or reuses) a PENDING access record; the client completes the
 * PayChangu checkout against its tx_ref.
 */
export async function startBiddingFeePayment(auctionItemId) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    if (isNaN(cleanId)) {
      return { success: false, error: "Invalid auction item ID." };
    }

    const item = await prisma.auctionItem.findUnique({
      where: { id: cleanId },
      select: { biddingFee: true },
    });
    if (!item) {
      return { success: false, error: "Auction item not found." };
    }

    const record = await prisma.auctionAccessPayment.upsert({
      where: {
        userId_auctionItemId_feeType: {
          userId: Number(session.user.id),
          auctionItemId: cleanId,
          feeType: "BIDDING_FEE",
        },
      },
      create: {
        userId: Number(session.user.id),
        auctionItemId: cleanId,
        feeType: "BIDDING_FEE",
        amount: item.biddingFee,
        status: "PENDING",
      },
      update: { status: "PENDING" },
    });

    return { success: true, data: { id: record.id, amount: Number(record.amount) } };
  } catch (error) {
    console.error("❌ Bidding fee start failure:", error);
    return { success: false, error: error.message || "Could not start bidding fee payment." };
  }
}

/**
 * Step 2 — begin the SECURITY DEPOSIT payment (only after the bidding fee is PAID).
 */
export async function startSecurityDepositPayment(auctionItemId) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    if (isNaN(cleanId)) {
      return { success: false, error: "Invalid auction item ID." };
    }

    const biddingFee = await prisma.auctionAccessPayment.findUnique({
      where: {
        userId_auctionItemId_feeType: {
          userId: Number(session.user.id),
          auctionItemId: cleanId,
          feeType: "BIDDING_FEE",
        },
      },
    });

    if (!biddingFee || biddingFee.status !== "PAID") {
      return { success: false, error: "You must complete the bidding fee payment first." };
    }

    const item = await prisma.auctionItem.findUnique({
      where: { id: cleanId },
      select: { depositAmount: true },
    });
    if (!item) {
      return { success: false, error: "Auction item not found." };
    }

    const record = await prisma.auctionAccessPayment.upsert({
      where: {
        userId_auctionItemId_feeType: {
          userId: Number(session.user.id),
          auctionItemId: cleanId,
          feeType: "SECURITY_DEPOSIT",
        },
      },
      create: {
        userId: Number(session.user.id),
        auctionItemId: cleanId,
        feeType: "SECURITY_DEPOSIT",
        amount: item.depositAmount,
        status: "PENDING",
      },
      update: { status: "PENDING" },
    });

    return { success: true, data: { id: record.id, amount: Number(record.amount) } };
  } catch (error) {
    console.error("❌ Security deposit start failure:", error);
    return { success: false, error: error.message || "Could not start security deposit payment." };
  }
}

/**
 * Confirm an access payment by its PayChangu tx_ref.
 * Called by the bidder's client after the gateway checkout returns/verifies.
 */
export async function confirmAuctionAccessPayment(auctionItemId, feeType, paymentRef) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    const normalizedType = feeType === "SECURITY_DEPOSIT" ? "SECURITY_DEPOSIT" : "BIDDING_FEE";

    if (isNaN(cleanId) || !paymentRef) {
      return { success: false, error: "Invalid payment confirmation parameters." };
    }

    // Trust but verify: ask the gateway for the real status when keys exist.
    // Payments complete asynchronously on the PayChangu checkout page, so a PENDING
    // result is normal — the client polls this action until the gateway reports success.
    let verified = null;
    let gatewayConfigured = Boolean(process.env.PAYCHANGU_SECRET_KEY);
    if (gatewayConfigured) {
      try {
        const verifyRes = await fetch(`https://api.paychangu.com/verify-payment/${paymentRef}`, {
          headers: {
            Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
            Accept: "application/json",
          },
        });
        const verifyData = await verifyRes.json();
        verified = verifyData?.data?.status || null;
      } catch (verifyErr) {
        console.error("[AccessPayment] verify error:", verifyErr);
      }
    }

    // Without gateway credentials (local dev/sandbox) we auto-confirm so the
    // access flow remains testable; in production the gateway decides.
    let effectiveStatus;
    if (!gatewayConfigured) {
      effectiveStatus = "PAID";
    } else if (verified === "success") {
      effectiveStatus = "PAID";
    } else if (verified === "failed") {
      effectiveStatus = "FAILED";
    } else {
      effectiveStatus = "PENDING";
    }

    const record = await prisma.auctionAccessPayment.update({
      where: {
        userId_auctionItemId_feeType: {
          userId: Number(session.user.id),
          auctionItemId: cleanId,
          feeType: normalizedType,
        },
      },
      data: {
        status: effectiveStatus,
        paymentRef,
        paidAt: effectiveStatus === "PAID" ? new Date() : null,
      },
    });

    if (effectiveStatus === "PENDING") {
      return { success: true, data: { status: record.status, feeType: record.feeType, needsVerification: true } };
    }

    if (effectiveStatus === "PAID") {
      // Keep the general payment ledger in sync for the payments dashboard.
      await prisma.payment.upsert({
        where: { reference: paymentRef },
        create: {
          userId: Number(session.user.id),
          amount: record.amount,
          reference: paymentRef,
          gatewayStatus: "completed",
          purpose: normalizedType,
        },
        update: { gatewayStatus: "completed", purpose: normalizedType },
      });
    }

    return { success: true, data: { status: record.status, feeType: record.feeType } };
  } catch (error) {
    console.error("❌ Access payment confirmation failure:", error);
    return { success: false, error: error.message || "Could not confirm the access payment." };
  }
}

/**
 * Check whether a bidder has cleared the full fee gate for an auction lot.
 */
export async function hasClearedAuctionGate(auctionItemId) {
  const status = await getAuctionAccessStatus(auctionItemId);
  if (!status.success) return { success: false, error: status.error };
  return { success: true, cleared: status.data.nextStep === "ACCESS_GRANTED", data: status.data };
}
