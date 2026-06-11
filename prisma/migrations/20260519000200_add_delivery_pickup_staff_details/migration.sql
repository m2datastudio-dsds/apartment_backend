ALTER TABLE "DeliveryRecord"
ADD COLUMN "pickupStaffId" TEXT,
ADD COLUMN "pickupStaffName" TEXT,
ADD COLUMN "pickupStaffUserId" TEXT,
ADD COLUMN "pickupStaffPhone" TEXT,
ADD COLUMN "pickedUpAt" TIMESTAMP(3);
