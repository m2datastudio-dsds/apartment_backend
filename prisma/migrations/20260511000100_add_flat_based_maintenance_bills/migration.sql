ALTER TABLE "MaintenanceBill"
  ADD COLUMN "flatId" TEXT;

ALTER TABLE "MaintenanceBill"
  ALTER COLUMN "residentId" DROP NOT NULL;

UPDATE "MaintenanceBill" bill
SET "flatId" = resident."flatId"
FROM "User" resident
WHERE bill."residentId" = resident."id"
  AND bill."flatId" IS NULL;

WITH ranked_bills AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "apartmentId", "flatId", "billingMonth"
      ORDER BY
        CASE WHEN "status" = 'PAID' THEN 0 ELSE 1 END,
        "updatedAt" DESC,
        "createdAt" DESC
    ) AS row_number
  FROM "MaintenanceBill"
  WHERE "flatId" IS NOT NULL
)
DELETE FROM "MaintenanceBill"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_bills
  WHERE row_number > 1
);

ALTER TABLE "MaintenanceBill"
  ADD CONSTRAINT "MaintenanceBill_flatId_fkey"
  FOREIGN KEY ("flatId") REFERENCES "Flat"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MaintenanceBill_apartmentId_flatId_billingMonth_key"
  ON "MaintenanceBill"("apartmentId", "flatId", "billingMonth");
