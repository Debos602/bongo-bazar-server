-- Indexes for foreign keys, listings and dashboards, plus in-app notifications.
-- If a customer reviewed the same product more than once, only their newest review is kept,
-- because the same customer may now review a product only once. Ratings are recalculated.

DELETE FROM "Review" a USING "Review" b
    WHERE a."userId" = b."userId" AND a."productId" = b."productId" AND a."id" < b."id";
CREATE UNIQUE INDEX "Review_userId_productId_key" ON "Review"("userId", "productId");

UPDATE "Product" p SET
    "rating" = COALESCE((SELECT ROUND(AVG(r."rating")::numeric, 2)::double precision FROM "Review" r WHERE r."productId" = p."id"), 0),
    "reviewCount" = (SELECT COUNT(*) FROM "Review" r WHERE r."productId" = p."id");

CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "Vendor_status_createdAt_idx" ON "Vendor"("status", "createdAt");
CREATE INDEX "Product_isPublished_isBlocked_createdAt_idx" ON "Product"("isPublished", "isBlocked", "createdAt");
CREATE INDEX "Product_vendorId_createdAt_idx" ON "Product"("vendorId", "createdAt");
CREATE INDEX "Product_rating_idx" ON "Product"("rating");
CREATE INDEX "Product_price_idx" ON "Product"("price");
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");
CREATE INDEX "Review_productId_createdAt_idx" ON "Review"("productId", "createdAt");
CREATE INDEX "Cart_productId_idx" ON "Cart"("productId");
CREATE INDEX "Wishlist_productId_idx" ON "Wishlist"("productId");
CREATE INDEX "Address_userId_idx" ON "Address"("userId");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "OrderItem_vendorOrderId_idx" ON "OrderItem"("vendorOrderId");
CREATE INDEX "VendorOrder_vendorId_createdAt_idx" ON "VendorOrder"("vendorId", "createdAt");
CREATE INDEX "VendorOrder_status_createdAt_idx" ON "VendorOrder"("status", "createdAt");
CREATE INDEX "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");
CREATE INDEX "Payment_stripeSessionId_idx" ON "Payment"("stripeSessionId");
CREATE INDEX "Coupon_vendorId_idx" ON "Coupon"("vendorId");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
