-- RenameEnum
ALTER TYPE "Role" RENAME TO "RoleEnum";

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- Seed default roles from the previous enum values.
INSERT INTO "Role" ("id", "name", "description", "updatedAt")
VALUES
    ('SYSTEM_ADMIN', 'SYSTEM_ADMIN', 'System administrator', CURRENT_TIMESTAMP),
    ('PROMOTER', 'PROMOTER', 'Promoter / super admin', CURRENT_TIMESTAMP),
    ('LOCATION_ADMIN', 'LOCATION_ADMIN', 'Location administrator', CURRENT_TIMESTAMP),
    ('APARTMENT_ADMIN', 'APARTMENT_ADMIN', 'Apartment administrator', CURRENT_TIMESTAMP),
    ('RESIDENT', 'RESIDENT', 'Resident user', CURRENT_TIMESTAMP),
    ('STAFF', 'STAFF', 'Staff user', CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

UPDATE "User"
SET "roleId" = "role"::TEXT;

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "RoleEnum";

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
