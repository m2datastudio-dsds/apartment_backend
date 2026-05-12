ALTER TABLE "Flat"
ADD COLUMN "occupancyStatus" TEXT DEFAULT 'VACANT',
ADD COLUMN "occupantName" TEXT,
ADD COLUMN "occupantPhone" TEXT,
ADD COLUMN "occupantEmail" TEXT,
ADD COLUMN "tenantName" TEXT,
ADD COLUMN "tenantPhone" TEXT,
ADD COLUMN "tenantEmail" TEXT,
ADD COLUMN "tenantStart" TIMESTAMP(3),
ADD COLUMN "tenantEnd" TIMESTAMP(3),
ADD COLUMN "notes" TEXT;
