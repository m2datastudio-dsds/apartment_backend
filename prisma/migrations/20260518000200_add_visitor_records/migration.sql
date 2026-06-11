CREATE TABLE "VisitorRecord" (
  "id" TEXT NOT NULL,
  "apartmentId" TEXT NOT NULL,
  "residentId" TEXT,
  "flatId" TEXT,
  "staffId" TEXT,
  "staffName" TEXT,
  "visitorType" TEXT NOT NULL DEFAULT 'VISITOR',
  "visitorName" TEXT NOT NULL,
  "mobileNumber" TEXT,
  "purpose" TEXT,
  "vehicleNumber" TEXT,
  "visitDate" TIMESTAMP(3),
  "passCode" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "blocked" BOOLEAN NOT NULL DEFAULT false,
  "residentName" TEXT,
  "residentMobile" TEXT,
  "flatNumber" TEXT,
  "blockName" TEXT,
  "proofType" TEXT,
  "proofName" TEXT,
  "proofData" TEXT,
  "documentType" TEXT,
  "documentNumber" TEXT,
  "notes" TEXT,
  "decisionAt" TIMESTAMP(3),
  "decisionNotes" TEXT,
  "entryAcceptedAt" TIMESTAMP(3),
  "exitAcceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VisitorRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VisitorRecord_passCode_key" ON "VisitorRecord"("passCode");
CREATE INDEX "VisitorRecord_apartmentId_idx" ON "VisitorRecord"("apartmentId");
CREATE INDEX "VisitorRecord_residentId_idx" ON "VisitorRecord"("residentId");
CREATE INDEX "VisitorRecord_flatId_idx" ON "VisitorRecord"("flatId");
CREATE INDEX "VisitorRecord_staffId_idx" ON "VisitorRecord"("staffId");
CREATE INDEX "VisitorRecord_status_idx" ON "VisitorRecord"("status");
CREATE INDEX "VisitorRecord_visitDate_idx" ON "VisitorRecord"("visitDate");

ALTER TABLE "VisitorRecord"
  ADD CONSTRAINT "VisitorRecord_apartmentId_fkey"
  FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitorRecord"
  ADD CONSTRAINT "VisitorRecord_residentId_fkey"
  FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VisitorRecord"
  ADD CONSTRAINT "VisitorRecord_flatId_fkey"
  FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VisitorRecord"
  ADD CONSTRAINT "VisitorRecord_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
