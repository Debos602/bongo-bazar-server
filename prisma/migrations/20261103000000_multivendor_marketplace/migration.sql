-- Multivendor marketplace. Keeps existing data:
--  * existing vendors become APPROVED (new applications default to PENDING)
--  * existing orders are split into VendorOrder rows with zero commission and zero
--    vendorEarning, so old orders do not create payable balances
--  * duplicate wishlist rows are removed (keeping the oldest) to allow a unique index

CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- Vendor
ALTER TABLE "Vendor"
    ADD COLUMN "slug" TEXT,
    ADD COLUMN "description" TEXT,
    ADD COLUMN "logo" TEXT,
    ADD COLUMN "banner" TEXT,
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "address" TEXT,
    ADD COLUMN "status" "VendorStatus" NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN "rejectionReason" TEXT,
    ADD COLUMN "approvedAt" TIMESTAMP(3),
    ADD COLUMN "commissionRate" DOUBLE PRECISION;
UPDATE "Vendor" SET "slug" = 'shop-' || "id", "approvedAt" = "createdAt";
ALTER TABLE "Vendor" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'PENDING';
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");

-- Product
ALTER TABLE "Product" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- Wishlist
DELETE FROM "Wishlist" a USING "Wishlist" b
    WHERE a."userId" = b."userId" AND a."productId" = b."productId" AND a."id" > b."id";
CREATE UNIQUE INDEX "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId");

-- Coupon
ALTER TABLE "Coupon"
    ADD COLUMN "usageLimit" INTEGER,
    ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "vendorId" INTEGER;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payment
ALTER TABLE "Payment"
    ADD COLUMN "stripeSessionId" TEXT,
    ADD COLUMN "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Order
ALTER TABLE "Order"
    ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "couponCode" TEXT;

-- VendorOrder
CREATE TABLE "VendorOrder" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "vendorDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vendorEarning" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trackingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VendorOrder_orderId_vendorId_key" ON "VendorOrder"("orderId", "vendorId");
CREATE INDEX "VendorOrder_vendorId_status_idx" ON "VendorOrder"("vendorId", "status");
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "vendorOrderId" INTEGER;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_vendorOrderId_fkey"
    FOREIGN KEY ("vendorOrderId") REFERENCES "VendorOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payout
CREATE TABLE "Payout" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL,
    "accountDetails" TEXT NOT NULL,
    "note" TEXT,
    "transactionRef" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Payout_vendorId_status_idx" ON "Payout"("vendorId", "status");
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: order money columns and one VendorOrder per (order, vendor)
UPDATE "Order" o SET "subtotal" = s.sub, "discount" = GREATEST(s.sub - o."total", 0)
FROM (SELECT "orderId", SUM("price" * "quantity") AS sub FROM "OrderItem" GROUP BY "orderId") s
WHERE s."orderId" = o."id";

INSERT INTO "VendorOrder" ("orderId", "vendorId", "status", "subtotal", "platformDiscount", "total", "createdAt", "updatedAt")
SELECT i."orderId", p."vendorId", o."status",
       ROUND(SUM(i."price" * i."quantity")::numeric, 2)::double precision,
       ROUND((SUM(i."price" * i."quantity") * o."discount" / NULLIF(o."subtotal", 0))::numeric, 2)::double precision,
       ROUND((SUM(i."price" * i."quantity") * o."total" / NULLIF(o."subtotal", 0))::numeric, 2)::double precision,
       o."createdAt", o."updatedAt"
FROM "OrderItem" i
JOIN "Product" p ON p."id" = i."productId"
JOIN "Order" o ON o."id" = i."orderId"
GROUP BY i."orderId", p."vendorId", o."status", o."discount", o."subtotal", o."total", o."createdAt", o."updatedAt";

UPDATE "OrderItem" i SET "vendorOrderId" = vo."id"
FROM "Product" p, "VendorOrder" vo
WHERE p."id" = i."productId" AND vo."orderId" = i."orderId" AND vo."vendorId" = p."vendorId";
