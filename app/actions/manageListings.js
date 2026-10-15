"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  assets,
  assetImages,
  auctionAccessPayments,
  auctionItems,
  auctionRegistrations,
  auctionSettlements,
  bids,
  dailySales,
  sales,
} from "@/lib/db/schema";
import { storeAssetImage, validateImageFile } from "@/lib/imageStorage";
import { and, eq, sql } from "drizzle-orm";

async function getManager() {
  const session = await auth();
  if (!session?.user?.id || !["AUCTIONEER", "ADMIN"].includes(session.user.role)) {
    throw new Error("Only auctioneers can manage listings.");
  }
  return session.user;
}

function getValue(details, key) {
  return details instanceof FormData ? details.get(key) : details?.[key];
}

function getRequiredText(details, key, label, maxLength) {
  const value = getValue(details, key);
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${label} is required and must be no longer than ${maxLength} characters.`);
  }
  return value.trim();
}

function getPositivePrice(details, key, label) {
  const value = Number(getValue(details, key));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return value;
}

async function hasRecord(tx, table, column, id) {
  const [record] = await tx.select({ id: table.id }).from(table)
    .where(eq(column, id))
    .limit(1);
  return Boolean(record);
}

async function hasAuctionActivity(tx, item) {
  const [bid, accessPayment, registration, settlement] = await Promise.all([
    hasRecord(tx, bids, bids.auctionItemId, item.id),
    hasRecord(tx, auctionAccessPayments, auctionAccessPayments.auctionItemId, item.id),
    hasRecord(tx, auctionRegistrations, auctionRegistrations.auctionItemId, item.id),
    hasRecord(tx, auctionSettlements, auctionSettlements.auctionItemId, item.id),
  ]);
  return Boolean(bid || accessPayment || registration || settlement);
}

async function canEditAuction(tx, item) {
  const now = new Date();
  return item.status === "UPCOMING" &&
    item.startTime > now &&
    item.endTime > now &&
    !(await hasAuctionActivity(tx, item));
}

async function storeReplacementImage(tx, auctionItemId, details) {
  const file = getValue(details, "assetImageFile");
  if (!file || typeof file === "string" || file.size === 0) return;

  validateImageFile(file);
  await tx.update(assetImages)
    .set({ isPrimary: false })
    .where(eq(assetImages.auctionItemId, auctionItemId));
  await storeAssetImage(tx, auctionItemId, file);
}

export async function updateListingDetails(kind, listingId, details) {
  try {
    const user = await getManager();
    const id = Number(listingId);
    if (!Number.isInteger(id) || id <= 0 || !["DAILY_SALE", "AUCTION", "PROPERTY"].includes(kind)) {
      return { success: false, error: "Invalid listing." };
    }

    const title = getRequiredText(details, "title", "Title", 255);
    const description = getRequiredText(details, "description", "Description", 10000);
    const clientName = getRequiredText(details, "clientName", "Client / location", 191);
    const category = getRequiredText(details, "category", "Category", 100);

    return await db.transaction(async (tx) => {
      let asset;
      let sale;
      let auction;
      if (kind === "DAILY_SALE") {
        await tx.execute(sql`SELECT "id" FROM "daily_sales" WHERE "id" = ${id} FOR UPDATE`);
        [sale] = await tx.select().from(dailySales).where(eq(dailySales.id, id)).limit(1);
        if (!sale) return { success: false, error: "Daily sale listing not found." };
        [asset] = await tx.select().from(assets).where(eq(assets.id, sale.assetId)).limit(1);
        if (asset?.salesType !== "DAILY_SALE") {
          return { success: false, error: "Daily sale listing not found." };
        }
        const [pendingPurchase] = await tx.select({ id: sales.id }).from(sales).where(and(
          eq(sales.dailySaleId, sale.id),
          eq(sales.status, "PENDING"),
        )).limit(1);
        if (pendingPurchase) return { success: false, error: "This item has a payment being processed and cannot be edited yet." };
      } else if (kind === "AUCTION") {
        await tx.execute(sql`SELECT "id" FROM "auction_items" WHERE "id" = ${id} FOR UPDATE`);
        [auction] = await tx.select().from(auctionItems).where(eq(auctionItems.id, id)).limit(1);
        if (!auction) return { success: false, error: "Auction listing not found." };
        [asset] = await tx.select().from(assets).where(eq(assets.id, auction.assetId)).limit(1);
        if (asset?.salesType !== "PROPERTY" || asset.listingType !== "AUCTION") {
          return { success: false, error: "Auction listing not found." };
        }
        if (!(await canEditAuction(tx, auction))) {
          return { success: false, error: "This auction can only be edited before it starts and before any bidder registers, pays, or places a bid." };
        }
      } else {
        [asset] = await tx.select().from(assets).where(and(
          eq(assets.id, id),
          eq(assets.salesType, "PROPERTY"),
        )).limit(1);
        if (!asset || !["SALE", "LEASE"].includes(asset.listingType)) {
          return { success: false, error: "Property listing not found." };
        }
        if (asset.isSold) return { success: false, error: "A paid property listing cannot be edited." };
        const [pendingPayment] = await tx.select({ id: sales.id }).from(sales).where(and(
          eq(sales.assetId, asset.id),
          eq(sales.status, "PENDING"),
        )).limit(1);
        if (pendingPayment) return { success: false, error: "This property has a payment being processed and cannot be edited yet." };
      }

      if (!asset || (user.role !== "ADMIN" && asset.createdById !== Number(user.id))) {
        return { success: false, error: "You can only edit listings that you created." };
      }
      if (!asset.isListed) return { success: false, error: "This listing has been deleted." };

      const assetChanges = {
        title,
        description,
        location: clientName,
        clientName,
        category,
      };
      let price;
      if (kind === "DAILY_SALE") {
        price = getPositivePrice(details, "price", "listing price");
        const stockCount = Number(getValue(details, "stockCount"));
        if (!Number.isInteger(stockCount) || stockCount < 1) {
          return { success: false, error: "Enter a stock count of at least one." };
        }
        await tx.update(dailySales).set({ price: String(price), stockCount, isAvailable: true })
          .where(eq(dailySales.id, id));
        const [imageItem] = await tx.select({ id: auctionItems.id }).from(auctionItems)
          .where(eq(auctionItems.assetId, asset.id)).limit(1);
        if (imageItem) await storeReplacementImage(tx, imageItem.id, details);
      } else if (kind === "AUCTION") {
        const startingBid = getPositivePrice(details, "startingBid", "starting bid");
        const reservePrice = getPositivePrice(details, "reservePrice", "reserve price");
        const entryFee = getPositivePrice(details, "entryFee", "entry fee");
        const biddingDeposit = getPositivePrice(details, "biddingDeposit", "bidding deposit");
        if (biddingDeposit <= startingBid) {
          return { success: false, error: "Bidding funds/security deposit must exceed the starting bid." };
        }
        const startTime = new Date(getValue(details, "startTime"));
        const endTime = new Date(getValue(details, "endTime"));
        if (
          Number.isNaN(startTime.getTime()) ||
          Number.isNaN(endTime.getTime()) ||
          startTime <= new Date() ||
          endTime <= startTime
        ) {
          return { success: false, error: "Choose a future auction start and an end time after it." };
        }
        await tx.update(auctionItems).set({
          startingBid,
          reservePrice,
          depositAmount: entryFee,
          biddingFee: biddingDeposit,
          startTime,
          endTime,
        }).where(eq(auctionItems.id, id));
        await storeReplacementImage(tx, id, details);
      } else {
        price = getPositivePrice(details, "price", "listing price");
        if (asset.listingType === "SALE") {
          assetChanges.salePrice = String(price);
        } else {
          const rentDueDay = Number(getValue(details, "rentDueDay"));
          if (!Number.isInteger(rentDueDay) || rentDueDay < 1 || rentDueDay > 28) {
            return { success: false, error: "Choose a rent due day between 1 and 28." };
          }
          assetChanges.monthlyRent = String(price);
          assetChanges.rentDueDay = rentDueDay;
        }
        const [imageItem] = await tx.select({ id: auctionItems.id }).from(auctionItems)
          .where(eq(auctionItems.assetId, asset.id)).limit(1);
        if (imageItem) await storeReplacementImage(tx, imageItem.id, details);
      }

      await tx.update(assets).set(assetChanges).where(eq(assets.id, asset.id));
      return { success: true };
    });
  } catch (error) {
    console.error("[Update listing]", error);
    return { success: false, error: error.message || "Could not update listing." };
  }
}

export async function deleteListing(kind, listingId) {
  try {
    const user = await getManager();
    const id = Number(listingId);
    if (!Number.isInteger(id) || id <= 0 || !["DAILY_SALE", "AUCTION", "PROPERTY"].includes(kind)) {
      return { success: false, error: "Invalid listing." };
    }

    return await db.transaction(async (tx) => {
      let assetId = id;
      let auction;
      if (kind === "DAILY_SALE") {
        await tx.execute(sql`SELECT "id" FROM "daily_sales" WHERE "id" = ${id} FOR UPDATE`);
        const [sale] = await tx.select({ assetId: dailySales.assetId }).from(dailySales)
          .where(eq(dailySales.id, id)).limit(1);
        if (!sale) return { success: false, error: "Daily sale listing not found." };
        assetId = sale.assetId;
        const [pendingPurchase] = await tx.select({ id: sales.id }).from(sales).where(and(
          eq(sales.dailySaleId, id),
          eq(sales.status, "PENDING"),
        )).limit(1);
        if (pendingPurchase) return { success: false, error: "This item has a payment being processed and cannot be removed yet." };
      } else if (kind === "AUCTION") {
        await tx.execute(sql`SELECT "id" FROM "auction_items" WHERE "id" = ${id} FOR UPDATE`);
        [auction] = await tx.select().from(auctionItems).where(eq(auctionItems.id, id)).limit(1);
        if (!auction) return { success: false, error: "Auction listing not found." };
        assetId = auction.assetId;
        if (
          ["ACTIVE", "LIVE"].includes(auction.status) ||
          (await hasAuctionActivity(tx, auction))
        ) {
          return { success: false, error: "This auction cannot be removed while live or once a bidder registers, pays, or places a bid." };
        }
      }

      const [asset] = await tx.select().from(assets).where(eq(assets.id, assetId)).limit(1);
      if (!asset || (user.role !== "ADMIN" && asset.createdById !== Number(user.id))) {
        return { success: false, error: "You can only remove listings that you created." };
      }
      if (kind === "DAILY_SALE" && asset.salesType !== "DAILY_SALE") {
        return { success: false, error: "Daily sale listing not found." };
      }
      if (kind === "AUCTION" && (asset.salesType !== "PROPERTY" || asset.listingType !== "AUCTION")) {
        return { success: false, error: "Auction listing not found." };
      }
      if (kind === "AUCTION" && asset.isSold) {
        return { success: false, error: "A completed auction listing cannot be removed." };
      }
      if (kind === "PROPERTY" && (asset.salesType !== "PROPERTY" || !["SALE", "LEASE"].includes(asset.listingType))) {
        return { success: false, error: "Only sale or lease property listings can be removed here." };
      }
      if (!asset.isListed) return { success: false, error: "This listing has already been removed." };

      if (kind === "PROPERTY") {
        if (asset.isSold) return { success: false, error: "A paid property listing cannot be removed." };
        const [pendingPayment] = await tx.select({ id: sales.id }).from(sales).where(and(
          eq(sales.assetId, asset.id),
          eq(sales.status, "PENDING"),
        )).limit(1);
        if (pendingPayment) return { success: false, error: "This property has a payment being processed and cannot be removed yet." };
      }

      await tx.update(assets).set({ isListed: false }).where(eq(assets.id, assetId));
      if (kind === "DAILY_SALE") {
        await tx.update(dailySales).set({ isAvailable: false }).where(eq(dailySales.id, id));
      } else if (kind === "AUCTION") {
        await tx.update(auctionItems).set({ status: "CLOSED" }).where(eq(auctionItems.id, id));
      }

      return { success: true };
    });
  } catch (error) {
    console.error("[Delete listing]", error);
    return { success: false, error: error.message || "Could not remove listing." };
  }
}
