import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { assets, auctionAccessPayments, auctionItems, payments, sales, users } from "@/lib/db/schema";
import { getPaymentListingDetails } from "@/lib/paymentReceipts";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filters = [];
    let auctioneers = [];
    if (session.user.role === "ADMIN") {
      const { searchParams } = new URL(request.url);
      const auctioneerIdValue = searchParams.get("auctioneerId");
      const fromValue = searchParams.get("from");
      const toValue = searchParams.get("to");
      const auctioneerId = auctioneerIdValue ? Number(auctioneerIdValue) : null;
      if (auctioneerIdValue && (!Number.isSafeInteger(auctioneerId) || auctioneerId <= 0)) {
        return NextResponse.json({ error: "Invalid auctioneer filter." }, { status: 400 });
      }
      const parseDate = (value) => {
        if (!value) return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
        const date = new Date(`${value}T00:00:00.000Z`);
        return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : date;
      };
      const fromDate = parseDate(fromValue);
      const toDate = parseDate(toValue);
      if (fromDate === undefined || toDate === undefined || (fromDate && toDate && fromDate > toDate)) {
        return NextResponse.json({ error: "Enter a valid payment date range." }, { status: 400 });
      }
      if (fromDate) filters.push(gte(payments.createdAt, fromDate));
      if (toDate) {
        const exclusiveEnd = new Date(toDate);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        filters.push(lt(payments.createdAt, exclusiveEnd));
      }
      auctioneers = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.role, "AUCTIONEER"))
        .orderBy(users.name);

      if (auctioneerId) {
        const auctioneer = auctioneers.find((entry) => entry.id === auctioneerId);
        if (!auctioneer) return NextResponse.json({ error: "Auctioneer not found." }, { status: 404 });
        const [saleReferences, feeReferences] = await Promise.all([
          db.select({ reference: sales.paymentRef })
            .from(sales)
            .where(eq(sales.sellerId, auctioneerId)),
          db.select({ reference: auctionAccessPayments.paymentRef })
            .from(auctionAccessPayments)
            .innerJoin(auctionItems, eq(auctionAccessPayments.auctionItemId, auctionItems.id))
            .innerJoin(assets, eq(auctionItems.assetId, assets.id))
            .where(eq(assets.createdById, auctioneerId)),
        ]);
        const references = [...saleReferences, ...feeReferences]
          .map((row) => row.reference)
          .filter(Boolean);
        if (!references.length) return NextResponse.json({ payments: [], auctioneers });
        filters.push(inArray(payments.reference, references));
      }
    } else {
      filters.push(eq(payments.userId, Number(session.user.id)));
    }
    const userPayments = await db.select().from(payments)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(50);

    const listingDetails = await getPaymentListingDetails(userPayments.map((payment) => payment.reference));
    return NextResponse.json({
      payments: userPayments.map((payment) => ({
        ...payment,
        ...(listingDetails.get(payment.reference) || {}),
      })),
      auctioneers,
    });
  } catch (error) {
    console.error("[Payments GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}