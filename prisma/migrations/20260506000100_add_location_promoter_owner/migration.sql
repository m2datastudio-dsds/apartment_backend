ALTER TABLE "Location" ADD COLUMN "promoterId" TEXT;

ALTER TABLE "Location"
  ADD CONSTRAINT "Location_promoterId_fkey"
  FOREIGN KEY ("promoterId") REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "Location_promoterId_idx" ON "Location"("promoterId");
