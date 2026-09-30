import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/listings
 *
 * Auctioneer management feed with the two required columns:
 *  - dailySales: all daily sale commodity listings created by this auctioneer
 *  - properties: all property auction listings created by this auctioneer
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (session.user.role !== "AUCTIONEER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only auctioneers can manage listings." }, { status: 403 });
    }

    const userId = Number(session.user.id);

    const dailySales = await prisma.dailySale.findMany({
      where: { asset: { createdById: userId } },
      include: {
        asset: {
          include: {
            auctionItems: {
              include: { images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const properties = await prisma.auctionItem.findMany({
      where: { asset: { createdById: userId, salesType: "PROPERTY" } },
      include: {
        asset: true,
        images: { where: { isPrimary: true }, take: 1 },
        bids: { orderBy: { amount: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      dailySales: dailySales.map((sale) => ({
        id: sale.id,
        assetId: sale.asset.id,
        title: sale.asset.title,
        description: sale.asset.description,
        category: sale.asset.category,
        location: sale.asset.location,
        price: Number(sale.price),
        stockCount: sale.stockCount,
        isAvailable: sale.isAvailable,
        imageUrl: sale.asset.auctionItems?.[0]?.images?.[0]?.url || null,
        createdAt: sale.createdAt.toISOString(),
      })),
      properties: properties.map((item) => ({
        id: item.id,
        assetId: item.assetId,
        title: item.asset.title,
        description: item.asset.description,
        category: item.asset.category,
        location: item.asset.location,
        startingBid: Number(item.startingBid),
        reservePrice: Number(item.reservePrice),
        depositAmount: Number(item.depositAmount),
        biddingFee: Number(item.biddingFee),
        status: item.status,
        currentBid: item.bids[0] ? Number(item.bids[0].amount) : null,
        imageUrl: item.images[0]?.url || null,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Listings API]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load listings." },
      { status: 500 }
    );
  }
}
