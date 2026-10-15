import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assetImageData } from "@/lib/db/schema";

export async function GET(_request, { params }) {
  const { imageId: rawImageId } = await params;
  const imageId = Number(rawImageId);
  if (!Number.isSafeInteger(imageId) || imageId <= 0) {
    return new Response("Image not found.", { status: 404 });
  }

  const [image] = await db.select({
    contentType: assetImageData.contentType,
    data: assetImageData.data,
  }).from(assetImageData).where(eq(assetImageData.assetImageId, imageId)).limit(1);

  if (!image) {
    return new Response("Image not found.", { status: 404 });
  }

  return new Response(image.data, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
