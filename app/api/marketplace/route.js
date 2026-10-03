import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/marketplace?tab=daily-sales|properties&q=search+term
 *
 * Bidder-facing marketplace feed:
 *  - tab=daily-sales  → regular sold commodities / goods (DAILY_SALE listings)
 *  - tab=properties   → land & buildings listed FOR SALE (PROPERTY listings)
 *
 * A single `q` search covers title, description, category and location.
 * Both tabs search across ALL auctioneers registered on the system.
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") === "properties" ? "properties" : "daily-sales";
    const q = (searchParams.get("q") || "").trim();
    const locationFilter = (searchParams.get("location") || "").trim();

    const baseWhere = { isSold: false };
    if (q) {
      baseWhere.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { category: { contains: q } },
        { location: { contains: q } },
      ];
    }

    // ── DAILY SALES: regular sold commodities (goods) across all auctioneers ──
    if (tab === "daily-sales") {
      const dailySales = await prisma.dailySale.findMany({
        where: {
          isAvailable: true,
          asset: {
            ...baseWhere,
            salesType: "DAILY_SALE",
          },
        },
        include: {
          asset: {
            include: {
              createdBy: { select: { id: true, name: true, email: true } },
              auctionItems: {
                include: { images: { where: { isPrimary: true }, take: 1 } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const items = dailySales.map((sale) => {
          const primaryImage =
            sale.asset.auctionItems?.flatMap((ai) => ai.images || [])[0]?.url || null;
          return {
            id: sale.id,
            assetId: sale.asset.id,
            title: sale.asset.title,
            description: sale.asset.description,
            category: sale.asset.category,
            location: sale.asset.location,
            price: Number(sale.price),
            attributes: sale.asset.attributes || {},
            imageUrl: primaryImage,
            auctioneerName: sale.asset.createdBy?.name || "Verified Auctioneer",
            auctioneerId: sale.asset.createdBy?.id || null,
            createdAt: sale.createdAt.toISOString(),
            kind: "DAILY_SALE",
          };
        });

      return NextResponse.json({ success: true, tab, count: items.length, items });
    }

    // ── PROPERTIES: land & buildings, searchable by location ──
    const propertiesWhere = {
      ...baseWhere,
      salesType: "PROPERTY",
    };

    if (locationFilter) {
      propertiesWhere.location = { contains: locationFilter };
    }

    const properties = await prisma.asset.findMany({
      where: propertiesWhere,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        auctionItems: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            bids: { orderBy: { amount: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = properties.map((asset) => {
      const liveAuction =
        asset.auctionItems.find((ai) => ai.status === "ACTIVE" || ai.status === "UPCOMING") ||
        asset.auctionItems[0] ||
        null;

      const salePrice = asset.salePrice
        ? Number(asset.salePrice)
        : liveAuction
        ? Number(liveAuction.reservePrice || liveAuction.startingBid)
        : null;

      return {
        id: asset.id,
        auctionItemId: liveAuction?.id || null,
        title: asset.title,
        description: asset.description,
        category: asset.category,
        location: asset.location,
        price: salePrice,
        startingBid: liveAuction ? Number(liveAuction.startingBid) : null,
        currentBid: liveAuction?.bids?.[0] ? Number(liveAuction.bids[0].amount) : null,
        auctionStatus: liveAuction?.status || null,
        biddingFee: liveAuction ? Number(liveAuction.biddingFee) : 0,
        depositAmount: liveAuction ? Number(liveAuction.depositAmount) : 0,
        imageUrl: liveAuction?.images?.[0]?.url || null,
        attributes: asset.attributes || {},
        auctioneerName: asset.createdBy?.name || "Verified Auctioneer",
        auctioneerId: asset.createdBy?.id || null,
        createdAt: asset.createdAt.toISOString(),
        kind: "PROPERTY",
      };
    });

    return NextResponse.json({ success: true, tab, count: items.length, items });
  } catch (error) {
    console.error("[Marketplace API]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load marketplace listings." },
      { status: 500 }
    );
  }
}
