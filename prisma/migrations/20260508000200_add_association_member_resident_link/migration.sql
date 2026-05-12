ALTER TABLE "AssociationMember"
ADD COLUMN "residentId" TEXT;

ALTER TABLE "AssociationMember"
ADD CONSTRAINT "AssociationMember_residentId_fkey"
FOREIGN KEY ("residentId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

