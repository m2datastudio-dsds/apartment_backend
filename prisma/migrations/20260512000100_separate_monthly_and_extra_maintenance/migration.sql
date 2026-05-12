ALTER TABLE "MaintenanceBill"
  ADD COLUMN IF NOT EXISTS "chargeType" TEXT NOT NULL DEFAULT 'MONTHLY';

DROP INDEX IF EXISTS "MaintenanceBill_apartmentId_residentId_billingMonth_key";
DROP INDEX IF EXISTS "MaintenanceBill_apartmentId_flatId_billingMonth_key";

CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceBill_monthly_flat_key"
  ON "MaintenanceBill"("apartmentId", "flatId", "billingMonth")
  WHERE "chargeType" = 'MONTHLY' AND "flatId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceBill_monthly_resident_key"
  ON "MaintenanceBill"("apartmentId", "residentId", "billingMonth")
  WHERE "chargeType" = 'MONTHLY' AND "residentId" IS NOT NULL;
