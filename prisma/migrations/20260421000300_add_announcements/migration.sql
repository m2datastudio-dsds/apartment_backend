CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" TEXT NOT NULL,
  "apartmentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "category" TEXT,
  "priority" TEXT DEFAULT 'NORMAL',
  "audience" TEXT DEFAULT 'ALL',
  "status" TEXT DEFAULT 'PUBLISHED',
  "publishAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_apartmentId_fkey'
  ) THEN
    ALTER TABLE "Announcement"
    ADD CONSTRAINT "Announcement_apartmentId_fkey"
    FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
