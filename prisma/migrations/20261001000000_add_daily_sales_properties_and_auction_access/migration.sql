/*
  Warnings:

  - Added the required column `salesType` on the `assets` table without a default value. This step will fail unless a default is supplied — `PROPERTY` is used here.
  - Added the required column `biddingFee` on the `auction_items` table without a default value. `0` is used here.

*/
-- AlterTable
ALTER TABLE `assets` ADD COLUMN `salesType` VARCHAR(50) NOT NULL DEFAULT 'PROPERTY',
    ADD COLUMN `salePrice` DECIMAL(14, 2) NULL,
    ADD COLUMN `isSold` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `auction_items` ADD COLUMN `biddingFee` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `daily_sales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` INTEGER NOT NULL,
    `price` DECIMAL(14, 2) NOT NULL,
    `stockCount` INTEGER NOT NULL DEFAULT 1,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auction_access_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `auctionItemId` INTEGER NOT NULL,
    `feeType` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `paymentRef` VARCHAR(191) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auction_access_payments_userId_auctionItemId_feeType_key`(`userId`, `auctionItemId`, `feeType`),
    INDEX `auction_access_payments_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_sales` ADD CONSTRAINT `daily_sales_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auction_access_payments` ADD CONSTRAINT `auction_access_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auction_access_payments` ADD CONSTRAINT `auction_access_payments_auctionItemId_fkey` FOREIGN KEY (`auctionItemId`) REFERENCES `auction_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
