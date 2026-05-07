CREATE TABLE IF NOT EXISTS "ApartmentDocument" (
  "id" TEXT NOT NULL,
  "apartmentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "fileType" TEXT,
  "fileName" TEXT,
  "fileData" TEXT,
  "status" TEXT DEFAULT 'ACTIVE',
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApartmentDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParkingSlot" (
  "id" TEXT NOT NULL,
  "apartmentId" TEXT NOT NULL,
  "flatId" TEXT,
  "residentId" TEXT,
  "slotNumber" TEXT NOT NULL,
  "vehicleNumber" TEXT,
  "vehicleType" TEXT,
  "ownerName" TEXT,
  "stickerNumber" TEXT,
  "status" TEXT DEFAULT 'ASSIGNED',
  "notes" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ParkingSlot_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApartmentDocument_apartmentId_fkey') THEN
    ALTER TABLE "ApartmentDocument"
    ADD CONSTRAINT "ApartmentDocument_apartmentId_fkey"
    FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ParkingSlot_apartmentId_fkey') THEN
    ALTER TABLE "ParkingSlot"
    ADD CONSTRAINT "ParkingSlot_apartmentId_fkey"
    FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ParkingSlot_flatId_fkey') THEN
    ALTER TABLE "ParkingSlot"
    ADD CONSTRAINT "ParkingSlot_flatId_fkey"
    FOREIGN KEY ("flatId") REFERENCES "Flat"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ParkingSlot_residentId_fkey') THEN
    ALTER TABLE "ParkingSlot"
    ADD CONSTRAINT "ParkingSlot_residentId_fkey"
    FOREIGN KEY ("residentId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
