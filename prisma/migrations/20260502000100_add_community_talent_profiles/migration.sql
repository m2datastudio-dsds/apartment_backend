CREATE TABLE "CommunityTalentProfile" (
    "id" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "residentId" TEXT,
    "flatId" TEXT,
    "apartmentName" TEXT,
    "residentName" TEXT NOT NULL,
    "flatNumber" TEXT,
    "blockName" TEXT,
    "profileTitle" TEXT NOT NULL,
    "mainSkill" TEXT,
    "interestArea" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "feedbackNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityTalentProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityTalentProfile_apartmentId_idx" ON "CommunityTalentProfile"("apartmentId");
CREATE INDEX "CommunityTalentProfile_residentId_idx" ON "CommunityTalentProfile"("residentId");
CREATE INDEX "CommunityTalentProfile_status_idx" ON "CommunityTalentProfile"("status");

ALTER TABLE "CommunityTalentProfile" ADD CONSTRAINT "CommunityTalentProfile_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityTalentProfile" ADD CONSTRAINT "CommunityTalentProfile_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunityTalentProfile" ADD CONSTRAINT "CommunityTalentProfile_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
