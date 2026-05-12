ALTER TABLE "Apartment"
ADD COLUMN "subscriptionBillingCycle" TEXT,
ADD COLUMN "subscriptionPaymentStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN "subscriptionPaidAt" TIMESTAMP(3);

