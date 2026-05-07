CREATE TABLE "MembershipPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "billingCycle" TEXT NOT NULL DEFAULT 'month',
  "status" TEXT NOT NULL DEFAULT 'Active',
  "residents" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL,
  "features" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipSubscription" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "residentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "startedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceItem" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Other',
  "price" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "seller" TEXT NOT NULL,
  "postedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmartGatePass" (
  "id" TEXT NOT NULL,
  "gate" TEXT NOT NULL DEFAULT 'Main Gate',
  "type" TEXT NOT NULL,
  "visitorName" TEXT NOT NULL,
  "flat" TEXT NOT NULL,
  "residentName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Waiting',
  "requestedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedTime" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SmartGatePass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryRecord" (
  "id" TEXT NOT NULL,
  "partner" TEXT NOT NULL,
  "trackingId" TEXT,
  "flat" TEXT NOT NULL,
  "residentName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Expected',
  "deliveryType" TEXT NOT NULL,
  "expectedTime" TEXT,
  "requestedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pet" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "breed" TEXT,
  "flat" TEXT NOT NULL,
  "ownerName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "vaccineStatus" TEXT NOT NULL DEFAULT 'Due',
  "documentName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PetPolicy" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'All residents',
  "message" TEXT NOT NULL,
  "sentOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PetPolicy_pkey" PRIMARY KEY ("id")
);
