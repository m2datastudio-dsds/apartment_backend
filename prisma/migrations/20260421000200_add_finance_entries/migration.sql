CREATE TABLE IF NOT EXISTS "FinanceEntry" (
  "id" TEXT NOT NULL,
  "apartmentId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "paymentMode" TEXT,
  "reference" TEXT,
  "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FinanceEntry_apartmentId_fkey'
  ) THEN
    ALTER TABLE "FinanceEntry"
    ADD CONSTRAINT "FinanceEntry_apartmentId_fkey"
    FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
