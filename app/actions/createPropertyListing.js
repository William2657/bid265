"use server";

import fs from "fs/promises";
import path from "path";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";

/**
 * 🏠 PROPERTY LISTING ENGINE
 *
 * Properties (land & buildings) are LISTED FOR SALE — never run through the
 * auction pipeline. This creates the property asset with a sale price; the
 * buyer purchases it directly from the Properties tab.
 */
export async function createPropertyListing(formData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication rejected. Please sign in." };
    }
    if (session.user.role !== "AUCTIONEER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Only auctioneers can publish property listings." };
    }

    const title = formData.get("title");
    const description = formData.get("description");
    const location = formData.get("location");
    const category = formData.get("category");
    const documentUrl = formData.get("documentUrl");
    const salePrice = parseFloat(formData.get("salePrice"));

    if (!title || !description || !location) {
      return { success: false, error: "Title, description and location are required." };
    }
    if (isNaN(salePrice) || salePrice <= 0) {
      return { success: false, error: "Please provide a valid sale price for the property." };
    }

    let parsedAttributes = [];
    try {
      parsedAttributes = JSON.parse(formData.get("dynamicAttributes") || "[]");
    } catch {
      parsedAttributes = [];
    }
    const formattedAttributes = {};
    if (Array.isArray(parsedAttributes)) {
      parsedAttributes.forEach((item) => {
        if (item?.key && item.key.trim() !== "") {
          formattedAttributes[item.key.trim()] = item.value;
        }
      });
    }

    const file = formData.get("assetImageFile");
    if (!file || file.size === 0) {
      return { success: false, error: "Please attach a primary display image photograph." };
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const fileExtension = path.extname(file.name);
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
    await fs.writeFile(path.join(uploadDir, uniqueFileName), Buffer.from(await file.arrayBuffer()));
    const imageUrl = `/uploads/${uniqueFileName}`;

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          title,
          description,
          location,
          category: category || "REAL_ESTATE",
          salesType: "PROPERTY",
          salePrice,
          attributes: formattedAttributes,
          documentUrl: documentUrl || null,
          createdById: Number(session.user.id),
        },
      });

      // Properties are not auctioned — this lot shell only carries the photo
      // through the existing image pipeline (it stays CLOSED, never listed
      // under the bidder's Auctions tab).
      const shell = await tx.auctionItem.create({
        data: {
          assetId: asset.id,
          startingBid: salePrice,
          reservePrice: salePrice,
          depositAmount: 0,
          biddingFee: 0,
          endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: "CLOSED",
          images: { create: { url: imageUrl, isPrimary: true } },
        },
      });

      return { asset, shell };
    });

    return {
      success: true,
      data: { assetId: result.asset.id, salePrice: Number(result.asset.salePrice) },
    };
  } catch (error) {
    console.error("❌ Property listing failure:", error);
    return { success: false, error: error.message || "Failed to publish the property listing." };
  }
}
