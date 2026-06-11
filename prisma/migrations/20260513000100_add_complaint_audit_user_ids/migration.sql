ALTER TABLE "Complaint" ADD COLUMN "assignedById" TEXT;
ALTER TABLE "Complaint" ADD COLUMN "closedById" TEXT;

ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
