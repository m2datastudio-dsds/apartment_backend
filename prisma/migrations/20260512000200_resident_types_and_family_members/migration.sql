ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "residentType" TEXT;

CREATE TABLE IF NOT EXISTS "ResidentFamilyMember" (
  "id" TEXT NOT NULL,
  "apartmentId" TEXT NOT NULL,
  "flatId" TEXT NOT NULL,
  "residentId" TEXT,
  "name" TEXT NOT NULL,
  "relationship" TEXT,
  "mobileNumber" TEXT,
  "email" TEXT,
  "age" INTEGER,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ResidentFamilyMember_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ResidentFamilyMember_apartmentId_fkey'
  ) THEN
    ALTER TABLE "ResidentFamilyMember"
      ADD CONSTRAINT "ResidentFamilyMember_apartmentId_fkey"
      FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ResidentFamilyMember_flatId_fkey'
  ) THEN
    ALTER TABLE "ResidentFamilyMember"
      ADD CONSTRAINT "ResidentFamilyMember_flatId_fkey"
      FOREIGN KEY ("flatId") REFERENCES "Flat"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ResidentFamilyMember_residentId_fkey'
  ) THEN
    ALTER TABLE "ResidentFamilyMember"
      ADD CONSTRAINT "ResidentFamilyMember_residentId_fkey"
      FOREIGN KEY ("residentId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ResidentFamilyMember_apartmentId_idx"
  ON "ResidentFamilyMember"("apartmentId");

CREATE INDEX IF NOT EXISTS "ResidentFamilyMember_flatId_idx"
  ON "ResidentFamilyMember"("flatId");

CREATE INDEX IF NOT EXISTS "ResidentFamilyMember_residentId_idx"
  ON "ResidentFamilyMember"("residentId");
