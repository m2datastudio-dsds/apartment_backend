CREATE TABLE "EmergencyEvent" (
  "id" TEXT NOT NULL,
  "apartmentId" TEXT NOT NULL,
  "flatId" TEXT,
  "residentId" TEXT,
  "residentName" TEXT,
  "flatLabel" TEXT,
  "mobileNumber" TEXT,
  "type" TEXT NOT NULL DEFAULT 'PANIC_ALERT',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "message" TEXT NOT NULL,
  "responseMessage" TEXT,
  "respondedById" TEXT,
  "respondedByName" TEXT,
  "respondedByRole" TEXT,
  "respondedAt" TIMESTAMP(3),
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmergencyEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmergencyEvent_apartmentId_idx" ON "EmergencyEvent"("apartmentId");
CREATE INDEX "EmergencyEvent_residentId_idx" ON "EmergencyEvent"("residentId");
CREATE INDEX "EmergencyEvent_status_idx" ON "EmergencyEvent"("status");
CREATE INDEX "EmergencyEvent_triggeredAt_idx" ON "EmergencyEvent"("triggeredAt");

ALTER TABLE "EmergencyEvent"
  ADD CONSTRAINT "EmergencyEvent_apartmentId_fkey"
  FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
