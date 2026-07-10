import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dashboard/bidder
 *
 * Returns a comprehensive dashboard overview for the authenticated bidder,
 * including stats, recent bids, winning bids, upcoming auctions,
 * registrations, payments, and activity metrics.
 */
export async function GET(request) {
  try {
    // ── 1. AUTHENTICATION ──────────────────────────────────────────────
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);

    // ── 2. FETCH ALL BIDS WITH RELATIONS ─────────────────────────────
    const allBids = await prisma.bid.findMany({
      where: { bidderId: userId },
      include: {
        auctionItem: {
          include: {
            asset: {
              select: { id: true, title: true, category: true, location: true },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── 3. ENRICH BIDS WITH COMPUTED STATUS ──────────────────────────
    const enrichedBids = await Promise.all(
      allBids.map(async (bid) => {
        const highestBid = await prisma.bid.findFirst({
          where: { auctionItemId: bid.auctionItemId },
          orderBy: { amount: "desc" },
          select: { amount: true, bidderId: true },
        });

        const now = new Date();
        const endTime = new Date(bid.auctionItem.endTime);
        const isAuctionClosed = endTime < now || bid.auctionItem.status === "CLOSED";

        let status;
        if (isAuctionClosed) {
          status = highestBid?.bidderId === userId ? "WON" : "LOST";
        } else if (highestBid?.bidderId === userId) {
          status = "WINNING";
        } else if (highestBid && highestBid.amount > bid.amount) {
          status = "OUTBID";
        } else {
          status = "ACTIVE";
        }

        return {
          id: bid.id,
          amount: bid.amount,
          createdAt: bid.createdAt,
          status,
          auctionItem: {
            id: bid.auctionItem.id,
            endTime: bid.auctionItem.endTime,
            status: bid.auctionItem.status,
            startingBid: bid.auctionItem.startingBid,
            currentPrice: highestBid?.amount || bid.amount,
            asset: bid.auctionItem.asset,
            images: bid.auctionItem.images,
          },
        };
      })
    );

    // ── 4. FETCH REGISTRATIONS ─────────────────────────────────────────
    const registrations = await prisma.auctionRegistration.findMany({
      where: { userId },
      include: {
        auctionItem: {
          include: {
            asset: {
              select: { id: true, title: true, category: true },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const enrichedRegistrations = registrations.map((reg) => ({
      id: reg.id,
      status: reg.status,
      createdAt: reg.createdAt,
      auctionItem: {
        id: reg.auctionItem.id,
        endTime: reg.auctionItem.endTime,
        status: reg.auctionItem.status,
        asset: reg.auctionItem.asset,
        images: reg.auctionItem.images,
      },
    }));

    // ── 5. FETCH PAYMENTS ────────────────────────────────────────────
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // ── 6. FETCH UPCOMING AUCTIONS ───────────────────────────────────
    const now = new Date();
    const upcomingAuctions = await prisma.auctionItem.findMany({
      where: {
        status: "UPCOMING",
        startTime: { gt: now },
      },
      include: {
        asset: {
          select: { id: true, title: true, category: true, location: true },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: 6,
    });

    // ── 7. COMPUTE STATS ───────────────────────────────────────────────
    const totalBids = enrichedBids.length;
    const winningBids = enrichedBids.filter((b) => b.status === "WINNING");
    const outbidCount = enrichedBids.filter((b) => b.status === "OUTBID").length;
    const auctionsWon = enrichedBids.filter((b) => b.status === "WON").length;
    const totalSpent = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(
      (p) => p.gatewayStatus === "SUCCESS" || p.gatewayStatus === "COMPLETED"
    ).length;
    const totalRegistrations = registrations.length;
    const approvedRegistrations = registrations.filter((r) => r.status === "APPROVED").length;
    const activeRegistrations = registrations.filter(
      (r) => r.status === "APPROVED" && new Date(r.auctionItem.endTime) > now
    ).length;

    // ── 8. BUILD RESPONSE ──────────────────────────────────────────────
    const dashboardData = {
      stats: {
        totalBids,
        winningBids: winningBids.length,
        outbidCount,
        auctionsWon,
        totalSpent,
        totalPayments,
        successfulPayments,
        totalRegistrations,
        approvedRegistrations,
        activeRegistrations,
        upcomingAuctions: upcomingAuctions.length,
        bidsTrend: totalBids > 5 ? 12 : totalBids > 0 ? 5 : 0, // placeholder trend
      },
      recentBids: enrichedBids.slice(0, 5),
      winningBids: winningBids.slice(0, 4),
      upcomingAuctions,
      registeredAuctions: enrichedRegistrations,
      recentPayments: payments,
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    console.error("[GET /api/dashboard/bidder] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}