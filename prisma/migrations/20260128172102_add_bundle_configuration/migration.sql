-- CreateTable
CREATE TABLE "BundleConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "products" TEXT NOT NULL,
    "discounts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BundleConfiguration_shop_key" ON "BundleConfiguration"("shop");
