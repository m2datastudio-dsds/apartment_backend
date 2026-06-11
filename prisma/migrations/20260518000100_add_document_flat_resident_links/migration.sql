ALTER TABLE "ApartmentDocument" ADD COLUMN "flatId" TEXT;
ALTER TABLE "ApartmentDocument" ADD COLUMN "residentId" TEXT;

CREATE INDEX "ApartmentDocument_apartmentId_idx" ON "ApartmentDocument"("apartmentId");
CREATE INDEX "ApartmentDocument_flatId_idx" ON "ApartmentDocument"("flatId");
CREATE INDEX "ApartmentDocument_residentId_idx" ON "ApartmentDocument"("residentId");

ALTER TABLE "ApartmentDocument"
  ADD CONSTRAINT "ApartmentDocument_flatId_fkey"
  FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApartmentDocument"
  ADD CONSTRAINT "ApartmentDocument_residentId_fkey"
  FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
