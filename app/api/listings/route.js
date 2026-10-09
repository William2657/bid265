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

    // Properties are LISTED FOR SALE (not auctioned) — read them as assets.
    const propertyAssets = await prisma.asset.findMany({
      where: { createdById: userId, salesType: "PROPERTY" },
      include: {
        auctionItems: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
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
      properties: propertyAssets.map((asset) => {
        const lot = asset.auctionItems?.[0] || null;
        const attrs =
          asset.attributes && typeof asset.attributes === "object" && !Array.isArray(asset.attributes)
            ? asset.attributes
            : {};
        const listingType = attrs.listingType === "LEASE" ? "LEASE" : "SALE";
        const monthlyRent = attrs.monthlyRent ? Number(attrs.monthlyRent) : null;
        const salePrice =
          listingType === "LEASE"
            ? monthlyRent || 0
            : asset.salePrice
            ? Number(asset.salePrice)
            : lot
            ? Number(lot.reservePrice)
            : 0;
        return {
          id: asset.id,
          assetId: asset.id,
          title: asset.title,
          description: asset.description,
          category: asset.category,
          location: asset.location,
          salePrice,
          listingType,
          monthlyRent,
          isSold: asset.isSold,
          status: asset.isSold
            ? "SOLD"
            : lot && lot.status !== "CLOSED"
            ? lot.status
            : "LISTED",
          imageUrl: lot?.images?.[0]?.url || null,
          createdAt: asset.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error("[Listings API]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load listings." },
      { status: 500 }
    );
  }
}
