import { eq } from "drizzle-orm";
import { assetImageData, assetImages } from "@/lib/db/schema";

export const MAX_IMAGE_SIZE = 3.5 * 1024 * 1024;

const supportedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateImageFile(file) {
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function" || file.size === 0) {
    throw new Error("Please attach a primary display image photograph.");
  }
  if (!supportedImageTypes.has(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image files must be 3.5 MB or smaller.");
  }
  return file.type;
}

export async function storeAssetImage(tx, auctionItemId, file) {
  const contentType = validateImageFile(file);
  const data = Buffer.from(await file.arrayBuffer());
  const [image] = await tx.insert(assetImages).values({
    auctionItemId,
    url: "",
    isPrimary: true,
  }).returning({ id: assetImages.id });

  const url = `/api/images/${image.id}`;
  await tx.insert(assetImageData).values({
    assetImageId: image.id,
    contentType,
    data,
  });
  await tx.update(assetImages)
    .set({ url })
    .where(eq(assetImages.id, image.id));

  return url;
}
