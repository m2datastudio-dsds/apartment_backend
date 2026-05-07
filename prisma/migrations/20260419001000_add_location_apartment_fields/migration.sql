-- AlterTable
ALTER TABLE "Location" ADD COLUMN "code" TEXT;
ALTER TABLE "Location" ADD COLUMN "region" TEXT;
ALTER TABLE "Location" ADD COLUMN "address" TEXT;
ALTER TABLE "Location" ADD COLUMN "city" TEXT;
ALTER TABLE "Location" ADD COLUMN "state" TEXT;
ALTER TABLE "Location" ADD COLUMN "country" TEXT;
ALTER TABLE "Location" ADD COLUMN "pincode" TEXT;
ALTER TABLE "Location" ADD COLUMN "timezone" TEXT;
ALTER TABLE "Location" ADD COLUMN "adminName" TEXT;
ALTER TABLE "Location" ADD COLUMN "adminEmail" TEXT;
ALTER TABLE "Location" ADD COLUMN "adminPhone" TEXT;
ALTER TABLE "Location" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Apartment" ADD COLUMN "code" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "address" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "city" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "state" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "pincode" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "totalBlocks" INTEGER;
ALTER TABLE "Apartment" ADD COLUMN "totalFlats" INTEGER;
ALTER TABLE "Apartment" ADD COLUMN "adminName" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "adminEmail" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "adminPhone" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "subscriptionPlan" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "onboardingStatus" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_code_key" ON "Apartment"("code");
