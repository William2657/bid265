"use server";

import fs from "fs/promises";
import path from "path";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";

/**
 * 🗓 AUCTION SCHEDULING ENGINE
 *
 * The old "relaunch" terminal is gone: an auction that has ended is brought
 * back simply by RESCHEDULING it (new start/end times reopen it as UPCOMING).
 * Every action is scoped to the signed-in auctioneer's own listings.
 */

async function requireAuctioneer() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication rejected. Please sign in.");
  }
  if (session.user.role !== "AUCTIONEER" && session.user.role !== "ADMIN") {
    throw new Error("Only auctioneers can schedule auctions.");
  }
  return session;
}

function parseAttributes(rawAttributes) {
  let parsed = [];
  try {
    parsed = JSON.parse(rawAttributes || "[]");
  } catch {
    parsed = [];
  }
  const formatted = {};
  if (Array.isArray(parsed)) {
    parsed.forEach((item) => {
      if (item?.key && item.key.trim() !== "") {
        formatted[item.key.trim()] = item.value;
      }
    });
  }
  return formatted;
}

/**
 * Schedule a brand-new auction (goods/assets consigned by a client).
 * Creates the asset + auction lot with explicit start/end times.
 */
export async function scheduleNewAuction(formData) {
  try {
    const session = await requireAuctioneer();

    const title = formData.get("title");
    const description = formData.get("description");
    const location = formData.get("location");
    const category = formData.get("category");
    const documentUrl = formData.get("documentUrl");
    const startingBid = parseFloat(formData.get("startingBid"));
    const reservePrice = parseFloat(formData.get("reservePrice"));
    const depositAmount = parseFloat(formData.get("depositAmount"));
    const biddingFee = parseFloat(formData.get("biddingFee") || "0");
    const startTimeRaw = formData.get("startTime");
    const endTimeRaw = formData.get("endTime");

    if (!title || !description || !location) {
      throw new Error("Title, description and location are required.");
    }
    if (isNaN(startingBid) || isNaN(reservePrice) || isNaN(depositAmount)) {
      throw new Error("Starting bid, reserve price and security deposit are required.");
    }

    const startTime = startTimeRaw ? new Date(startTimeRaw) : new Date();
    const endTime = endTimeRaw ? new Date(endTimeRaw) : new Date(Date.now() + 4 * 60 * 60 * 1000);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("Please provide a valid start and end time.");
    }
    if (endTime <= startTime) {
      throw new Error("The end time must be after the start time.");
    }

    const file = formData.get("assetImageFile");
    if (!file || file.size === 0) {
      throw new Error("Please attach a primary display image photograph.");
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const fileExtension = path.extname(file.name);
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
    await fs.writeFile(path.join(uploadDir, uniqueFileName), Buffer.from(await file.arrayBuffer()));
    const imageUrl = `/uploads/${uniqueFileName}`;

    const formattedAttributes = parseAttributes(formData.get("dynamicAttributes"));

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          title,
          description,
          location,
          category: category || "OTHER",
          salesType: "AUCTION",
          attributes: formattedAttributes,
          documentUrl: documentUrl || null,
          createdById: Number(session.user.id),
        },
      });

      const auctionItem = await tx.auctionItem.create({
        data: {
          assetId: asset.id,
          startingBid,
          reservePrice,
          depositAmount,
          biddingFee: isNaN(biddingFee) ? 0 : biddingFee,
          startTime,
          endTime,
          status: "UPCOMING",
          images: { create: { url: imageUrl, isPrimary: true } },
        },
        include: { images: true },
      });

      return { asset, auctionItem };
    });

    return {
      success: true,
      data: {
        id: result.auctionItem.id,
        assetId: result.asset.id,
        status: result.auctionItem.status,
        startTime: result.auctionItem.startTime.toISOString(),
        endTime: result.auctionItem.endTime.toISOString(),
      },
    };
  } catch (error) {
    console.error("❌ Auction scheduling failure:", error);
    return { success: false, error: error.message || "Failed to schedule the auction." };
  }
}

/**
 * Reschedule an existing auction (also reopens a CLOSED auction —
 * this is what replaced the old relaunch section).
 */
export async function scheduleAuction(auctionItemId, startTimeRaw, endTimeRaw) {
  try {
    const session = await requireAuctioneer();

    const cleanId = Number(auctionItemId);
    const startTime = new Date(startTimeRaw);
    const endTime = new Date(endTimeRaw);

    if (isNaN(cleanId) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("Please provide valid start and end times.");
    }
    if (endTime <= startTime) {
      throw new Error("The end time must be after the start time.");
    }

    const existing = await prisma.auctionItem.findFirst({
      where: { id: cleanId, asset: { createdById: Number(session.user.id) } },
      select: { id: true, status: true },
    });
    if (!existing && session.user.role !== "ADMIN") {
      throw new Error("This auction belongs to another auctioneer.");
    }
    if (!existing) {
      throw new Error("Auction not found.");
    }

    // Rescheduling reopens anything that already ended — no relaunch needed.
    const reopened = existing.status === "CLOSED";

    const updated = await prisma.auctionItem.update({
      where: { id: cleanId },
      data: {
        startTime,
        endTime,
        status: reopened ? "UPCOMING" : existing.status,
      },
      include: { asset: true },
    });

    return {
      success: true,
      reopened,
      data: {
        id: updated.id,
        status: updated.status,
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime.toISOString(),
      },
    };
  } catch (error) {
    console.error("❌ Auction reschedule failure:", error);
    return { success: false, error: error.message || "Failed to reschedule the auction." };
  }
}
