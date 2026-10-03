import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const isAuctioneer =
      session.user.role === "AUCTIONEER" || session.user.role === "ADMIN";

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Bidding fees & security deposits paid into the system:
    //  - bidders see their own payments
    //  - auctioneers see every payment made against their own auctions
    const accessPayments = await prisma.auctionAccessPayment.findMany({
      where: isAuctioneer
        ? { auctionItem: { asset: { createdById: userId } } }
        : { userId },
      include: {
        auctionItem: {
          select: {
            id: true,
            asset: { select: { id: true, title: true, location: true } },
          },
        },
        user: isAuctioneer ? { select: { id: true, name: true, email: true } } : false,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      payments,
      accessPayments: accessPayments.map((p) => ({
        id: p.id,
        feeType: p.feeType,
        amount: Number(p.amount),
        status: p.status,
        paymentRef: p.paymentRef,
        auctionItemId: p.auctionItemId,
        auctionTitle: p.auctionItem?.asset?.title || `Lot #${p.auctionItemId}`,
        auctionLocation: p.auctionItem?.asset?.location || "",
        payerName: p.user?.name || null,
        payerEmail: p.user?.email || null,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Payments GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
