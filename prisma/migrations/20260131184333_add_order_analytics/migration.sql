-- CreateTable
CREATE TABLE "OrderAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "totalPrice" REAL NOT NULL,
    "discountAmount" REAL NOT NULL,
    "discountCode" TEXT NOT NULL,
    "bundleType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderAnalytics_orderId_key" ON "OrderAnalytics"("orderId");
