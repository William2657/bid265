CREATE TABLE "asset_image_data" (
	"assetImageId" integer PRIMARY KEY NOT NULL,
	"contentType" varchar(100) NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_image_data" ADD CONSTRAINT "asset_image_data_assetImageId_asset_images_id_fk" FOREIGN KEY ("assetImageId") REFERENCES "public"."asset_images"("id") ON DELETE cascade ON UPDATE no action;