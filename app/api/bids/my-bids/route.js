import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bids/my-bids
 *
 * Returns all bids placed by the authenticated user,
 * including auction item details, asset info, images, and computed status.
 *
 * Query params:
 *   - status: filter by status (WINNING | OUTBID | ACTIVE | WON | LOST)
 *   - search: filter by asset title or category
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 20)
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

    // ── 2. PARSE QUERY PARAMS ────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "ALL";
    const searchQuery = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    // ── 3. FETCH BIDS WITH RELATIONS ─────────────────────────────────
    const bids = await prisma.bid.findMany({
      where: {
        bidderId: userId,
      },
      include: {
        auctionItem: {
          include: {
            asset: {
              select: {
                id: true,
                title: true,
                category: true,
                description: true,
                location: true,
              },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
            _count: {
              select: { bids: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // ── 4. ENRICH WITH COMPUTED STATUS & FILTER ───────────────────────
    const enrichedBids = await Promise.all(
      bids.map(async (bid) => {
        // Get the current highest bid for this auction item
        const highestBid = await prisma.bid.findFirst({
          where: { auctionItemId: bid.auctionItemId },
          orderBy: { amount: "desc" },
          select: { amount: true, bidderId: true },
        });

        const now = new Date();
        const endTime = new Date(bid.auctionItem.endTime);
        const isAuctionClosed = endTime < now || bid.auctionItem.status === "CLOSED";

        // Compute status
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
          isWinningBid: bid.isWinningBid,
          status,
          auctionItem: {
            id: bid.auctionItem.id,
            reservePrice: bid.auctionItem.reservePrice,
            startingBid: bid.auctionItem.startingBid,
            depositAmount: bid.auctionItem.depositAmount,
            startTime: bid.auctionItem.startTime,
            endTime: bid.auctionItem.endTime,
            status: bid.auctionItem.status,
            liveRoomId: bid.auctionItem.liveRoomId,
            currentPrice: highestBid?.amount || bid.amount,
            totalBids: bid.auctionItem._count.bids,
            asset: bid.auctionItem.asset,
            images: bid.auctionItem.images,
          },
        };
      })
    );

    // Apply status filter
    let filteredBids = enrichedBids;
    if (statusFilter !== "ALL") {
      filteredBids = enrichedBids.filter((b) => b.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredBids = filteredBids.filter(
        (b) =>
          b.auctionItem.asset.title.toLowerCase().includes(q) ||
          b.auctionItem.asset.category.toLowerCase().includes(q)
      );
    }

    // ── 5. PAGINATE ──────────────────────────────────────────────────
    const total = filteredBids.length;
    const paginatedBids = filteredBids.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    // ── 6. STATS ─────────────────────────────────────────────────────
    const stats = {
      totalBids: enrichedBids.length,
      winning: enrichedBids.filter((b) => b.status === "WINNING").length,
      outbid: enrichedBids.filter((b) => b.status === "OUTBID").length,
      won: enrichedBids.filter((b) => b.status === "WON").length,
      lost: enrichedBids.filter((b) => b.status === "LOST").length,
      active: enrichedBids.filter((b) => b.status === "ACTIVE").length,
    };

    // ── 7. RESPONSE ──────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: paginatedBids,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats,
    });

  } catch (error) {
    console.error("[GET /api/bids/my-bids] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}