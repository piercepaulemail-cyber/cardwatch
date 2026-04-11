-- AlterTable
ALTER TABLE "ScanResult" ADD COLUMN     "marketLastFetched" TIMESTAMP(3),
ADD COLUMN     "marketPsa10" DOUBLE PRECISION,
ADD COLUMN     "marketPsa9" DOUBLE PRECISION,
ADD COLUMN     "marketUngraded" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MarketPriceCache" (
    "id" TEXT NOT NULL,
    "searchKey" TEXT NOT NULL,
    "scpProductId" TEXT,
    "productName" TEXT,
    "ungraded" DOUBLE PRECISION,
    "psa9" DOUBLE PRECISION,
    "psa10" DOUBLE PRECISION,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPriceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketPriceCache_searchKey_key" ON "MarketPriceCache"("searchKey");

-- CreateIndex
CREATE INDEX "MarketPriceCache_searchKey_idx" ON "MarketPriceCache"("searchKey");
