/*
  Warnings:

  - You are about to drop the column `tag` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('NEW', 'HOT', 'SALE', 'BESTSELLER', 'LIMITED');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "tag",
ADD COLUMN     "badgeType" "BadgeType",
ADD COLUMN     "tags" TEXT[];
