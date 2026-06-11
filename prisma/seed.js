const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const samplePdfData =
  "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iago=";
const sampleJpegData =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z";
const samplePngData =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p94AAAAASUVORK5CYII=";

const roles = [
  ["SYSTEM_ADMIN", "System administrator"],
  ["PROMOTER", "Promoter / super admin"],
  ["LOCATION_ADMIN", "Location administrator"],
  ["APARTMENT_ADMIN", "Apartment administrator"],
  ["RESIDENT", "Resident user"],
  ["STAFF", "Staff user"],
];

async function upsertRoles() {
  await Promise.all(
    roles.map(([name, description]) =>
      prisma.role.upsert({
        where: { name },
        update: { description },
        create: {
          id: name,
          name,
          description,
        },
      })
    )
  );
}

async function findOrCreateLocation(name) {
  const existing = await prisma.location.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.location.create({ data: { name } });
}

async function findOrCreateApartment(name, locationId) {
  const existing = await prisma.apartment.findFirst({ where: { name, locationId } });
  if (existing) return existing;

  return prisma.apartment.create({ data: { name, locationId } });
}

async function findOrCreateBlock(name, apartmentId) {
  const existing = await prisma.block.findFirst({ where: { name, apartmentId } });
  if (existing) return existing;

  return prisma.block.create({ data: { name, apartmentId } });
}

async function findOrCreateFlat(number, apartmentId, blockId) {
  const existing = await prisma.flat.findFirst({ where: { number, apartmentId } });
  if (existing) return existing;

  return prisma.flat.create({
    data: {
      number,
      apartmentId,
      blockId,
    },
  });
}

async function upsertUser({
  userId,
  name,
  mobileNumber,
  email,
  password,
  roleId,
  locationId,
  apartmentId,
  flatId,
  organizationName,
  accessLevel,
  assignedRegion,
  accountStatus,
  onboardingFlow,
  residentType,
  age,
  proofDocumentType,
  proofDocumentName,
  proofDocumentData,
}) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { mobileNumber },
    update: {
      userId,
      name,
      email,
      password: hashedPassword,
      roleId,
      locationId: locationId || null,
      apartmentId: apartmentId || null,
      flatId: flatId || null,
      organizationName: organizationName || null,
      accessLevel: accessLevel || null,
      assignedRegion: assignedRegion || null,
      accountStatus: accountStatus || null,
      onboardingFlow: onboardingFlow || null,
      residentType: residentType || null,
      age: age || null,
      proofDocumentType: proofDocumentType || null,
      proofDocumentName: proofDocumentName || null,
      proofDocumentData: proofDocumentData || null,
    },
    create: {
      userId,
      name,
      mobileNumber,
      email,
      password: hashedPassword,
      roleId,
      locationId: locationId || null,
      apartmentId: apartmentId || null,
      flatId: flatId || null,
      organizationName: organizationName || null,
      accessLevel: accessLevel || null,
      assignedRegion: assignedRegion || null,
      accountStatus: accountStatus || null,
      onboardingFlow: onboardingFlow || null,
      residentType: residentType || null,
      age: age || null,
      proofDocumentType: proofDocumentType || null,
      proofDocumentName: proofDocumentName || null,
      proofDocumentData: proofDocumentData || null,
    },
  });
}

async function findOrCreateBy(modelName, where, data) {
  const model = prisma[modelName];
  const existing = await model.findFirst({ where });

  if (existing) {
    return model.update({
      where: { id: existing.id },
      data,
    });
  }

  return model.create({ data: { ...where, ...data } });
}

async function findOrCreateComplaint({
  title,
  description,
  status,
  apartmentId,
  flatId,
  residentId,
  assignedStaffId,
  assignedById,
  closedById,
  residentProofName,
  residentProofType,
  residentProofData,
  staffProofName,
  staffProofType,
  staffProofData,
  staffProofNotes,
}) {
  const existing = await prisma.complaint.findFirst({
    where: {
      title,
      apartmentId,
      residentId,
    },
  });

  if (existing) {
    return prisma.complaint.update({
      where: { id: existing.id },
      data: {
        description,
        status,
        flatId: flatId || null,
        assignedStaffId: assignedStaffId || null,
        assignedById: assignedById || null,
        closedById: closedById || null,
        residentProofType: residentProofType || (residentProofName ? "image/jpeg" : null),
        residentProofName: residentProofName || null,
        residentProofData: residentProofData || null,
        staffProofType: staffProofType || (staffProofName ? "image/jpeg" : null),
        staffProofName: staffProofName || null,
        staffProofData: staffProofData || null,
        staffProofNotes: staffProofNotes || null,
      },
    });
  }

  return prisma.complaint.create({
    data: {
      title,
      description,
      status,
      apartmentId,
      flatId: flatId || null,
      residentId,
      assignedStaffId: assignedStaffId || null,
      assignedById: assignedById || null,
      closedById: closedById || null,
      residentProofType: residentProofType || (residentProofName ? "image/jpeg" : null),
      residentProofName: residentProofName || null,
      residentProofData: residentProofData || null,
      staffProofType: staffProofType || (staffProofName ? "image/jpeg" : null),
      staffProofName: staffProofName || null,
      staffProofData: staffProofData || null,
      staffProofNotes: staffProofNotes || null,
    },
  });
}

async function main() {
  await upsertRoles();

  const location = await findOrCreateLocation("Chennai South");
  const apartment = await findOrCreateApartment("Prestige Palms", location.id);
  const block = await findOrCreateBlock("A Block", apartment.id);
  const flat = await findOrCreateFlat("A-101", apartment.id, block.id);
  const flatTwo = await findOrCreateFlat("A-102", apartment.id, block.id);

  const systemAdmin = await upsertUser({
    userId: "SYS1001",
    name: "System Admin",
    mobileNumber: "9000000001",
    email: "systemadmin@example.com",
    password: "password123",
    roleId: "SYSTEM_ADMIN",
    organizationName: "Apartment Management System",
    accessLevel: "FULL_ACCESS",
    assignedRegion: "ALL",
    accountStatus: "ACTIVE",
    onboardingFlow: "COMPLETED",
  });

  const promoter = await upsertUser({
    userId: "PRO1001",
    name: "Rajesh Kumar",
    mobileNumber: "9000000002",
    email: "superadmin@example.com",
    password: "password123",
    roleId: "PROMOTER",
    locationId: location.id,
    organizationName: "Rajesh Realty Group",
    accessLevel: "PROMOTER_ADMIN",
    assignedRegion: "Chennai",
    accountStatus: "ACTIVE",
    onboardingFlow: "COMPLETED",
  });

  await prisma.location.update({
    where: { id: location.id },
    data: {
      code: "CHN-SOUTH",
      region: "South Chennai",
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      pincode: "600097",
      timezone: "Asia/Kolkata",
      adminName: "Meera Iyer",
      adminEmail: "locationadmin@example.com",
      adminPhone: "9000000005",
      promoterId: promoter.id,
      status: "ACTIVE",
    },
  });

  await prisma.apartment.update({
    where: { id: apartment.id },
    data: {
      code: "PP-CHN-001",
      address: "OMR Main Road, Sholinganallur",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600119",
      totalBlocks: 3,
      totalFlats: 120,
      adminName: "Karthik Menon",
      adminEmail: "apartmentadmin@example.com",
      adminPhone: "9000000006",
      subscriptionPlan: "PREMIUM",
      subscriptionBillingCycle: "MONTHLY",
      subscriptionPaymentStatus: "PAID",
      onboardingStatus: "COMPLETED",
      status: "ACTIVE",
    },
  });

  const locationAdmin = await upsertUser({
    userId: "LOC1001",
    name: "Meera Iyer",
    mobileNumber: "9000000005",
    email: "locationadmin@example.com",
    password: "password123",
    roleId: "LOCATION_ADMIN",
    locationId: location.id,
    organizationName: "Chennai South Operations",
    accessLevel: "LOCATION_ADMIN",
    assignedRegion: "Chennai South",
    accountStatus: "ACTIVE",
    onboardingFlow: "COMPLETED",
  });

  const apartmentAdmin = await upsertUser({
    userId: "APT1001",
    name: "Karthik Menon",
    mobileNumber: "9000000006",
    email: "apartmentadmin@example.com",
    password: "password123",
    roleId: "APARTMENT_ADMIN",
    locationId: location.id,
    apartmentId: apartment.id,
    organizationName: "Prestige Palms Association",
    accessLevel: "APARTMENT_ADMIN",
    assignedRegion: "Prestige Palms",
    accountStatus: "ACTIVE",
    onboardingFlow: "COMPLETED",
  });

  const resident = await upsertUser({
    userId: "RES1001",
    name: "Priya Nair",
    mobileNumber: "9000000003",
    email: "resident@example.com",
    password: "password123",
    roleId: "RESIDENT",
    locationId: location.id,
    apartmentId: apartment.id,
    flatId: flat.id,
    accountStatus: "ACTIVE",
    residentType: "OWNER",
    age: 34,
    proofDocumentType: "application/pdf",
    proofDocumentName: "priya-nair-owner-id.pdf",
    proofDocumentData: samplePdfData,
  });

  await prisma.flat.update({
    where: { id: flat.id },
    data: {
      squareFeet: 1120,
      floorNumber: 1,
      bedroomCount: 2,
      bathroomCount: 2,
      facing: "EAST",
      flatType: "2BHK",
      occupancyStatus: "OCCUPIED",
      occupantName: resident.name,
      occupantPhone: resident.mobileNumber,
      occupantEmail: resident.email,
    },
  });

  const residentTwo = await upsertUser({
    userId: "RES1002",
    name: "Vikram Rao",
    mobileNumber: "9000000007",
    email: "resident2@example.com",
    password: "password123",
    roleId: "RESIDENT",
    locationId: location.id,
    apartmentId: apartment.id,
    flatId: flatTwo.id,
    accountStatus: "ACTIVE",
    residentType: "TENANT",
    age: 39,
    proofDocumentType: "application/pdf",
    proofDocumentName: "vikram-rao-rental-agreement.pdf",
    proofDocumentData: samplePdfData,
  });

  await prisma.flat.update({
    where: { id: flatTwo.id },
    data: {
      squareFeet: 1380,
      floorNumber: 1,
      bedroomCount: 3,
      bathroomCount: 2,
      facing: "WEST",
      flatType: "3BHK",
      occupancyStatus: "OCCUPIED",
      occupantName: residentTwo.name,
      occupantPhone: residentTwo.mobileNumber,
      occupantEmail: residentTwo.email,
    },
  });

  const staff = await upsertUser({
    userId: "STF1001",
    name: "Arun Service",
    mobileNumber: "9000000004",
    email: "staff@example.com",
    password: "password123",
    roleId: "STAFF",
    locationId: location.id,
    apartmentId: apartment.id,
    accountStatus: "ACTIVE",
    accessLevel: "Plumbing Staff",
    onboardingFlow: "MANUAL_STAFF",
    proofDocumentType: "application/pdf",
    proofDocumentName: "arun-service-police-verification.pdf",
    proofDocumentData: samplePdfData,
  });

  const electrician = await upsertUser({
    userId: "STF1002",
    name: "Suresh Electrician",
    mobileNumber: "9000000008",
    email: "staff2@example.com",
    password: "password123",
    roleId: "STAFF",
    locationId: location.id,
    apartmentId: apartment.id,
    accountStatus: "ACTIVE",
    accessLevel: "Electrical Staff",
    onboardingFlow: "MANUAL_STAFF",
    proofDocumentType: "application/pdf",
    proofDocumentName: "suresh-electrician-id-proof.pdf",
    proofDocumentData: samplePdfData,
  });

  await findOrCreateComplaint({
    title: "Water leakage in kitchen",
    description: "Tap leakage below the kitchen sink needs a plumber visit.",
    status: "ASSIGNED",
    apartmentId: apartment.id,
    flatId: flat.id,
    residentId: resident.id,
    assignedStaffId: staff.id,
    assignedById: apartmentAdmin.id,
    residentProofName: "kitchen-leak.jpg",
    residentProofData: sampleJpegData,
  });

  await findOrCreateComplaint({
    title: "Corridor light not working",
    description: "First floor corridor light near A-102 has stopped working.",
    status: "WORKED",
    apartmentId: apartment.id,
    flatId: flatTwo.id,
    residentId: residentTwo.id,
    assignedStaffId: electrician.id,
    assignedById: apartmentAdmin.id,
    residentProofName: "corridor-light.jpg",
    residentProofData: sampleJpegData,
    staffProofName: "corridor-light-fixed.jpg",
    staffProofData: sampleJpegData,
    staffProofNotes: "Replaced the faulty LED driver and tested the fixture.",
  });

  await findOrCreateComplaint({
    title: "Lift door noise",
    description: "Lift door in A Block makes a loud sound while closing.",
    status: "OPEN",
    apartmentId: apartment.id,
    flatId: flat.id,
    residentId: resident.id,
    residentProofName: "lift-door-noise.mp4",
    residentProofType: "video/mp4",
    residentProofData: "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=",
  });

  await findOrCreateComplaint({
    title: "Bathroom exhaust fan repair",
    description: "Exhaust fan was not running and needed replacement.",
    status: "COMPLETED",
    apartmentId: apartment.id,
    flatId: flatTwo.id,
    residentId: residentTwo.id,
    assignedStaffId: electrician.id,
    assignedById: apartmentAdmin.id,
    closedById: apartmentAdmin.id,
    residentProofName: "exhaust-fan-issue.jpg",
    residentProofData: sampleJpegData,
    staffProofName: "exhaust-fan-completed.jpg",
    staffProofData: sampleJpegData,
    staffProofNotes: "Installed replacement exhaust fan and resident confirmed completion.",
  });

  let amenity = await prisma.amenity.findFirst({
    where: {
      apartmentId: apartment.id,
      name: "Community Hall",
    },
  });

  if (!amenity) {
    amenity = await prisma.amenity.create({
      data: {
        apartmentId: apartment.id,
        name: "Community Hall",
        type: "EVENT_SPACE",
        description: "Air-conditioned hall for resident meetings, birthdays, and community events.",
        location: "Clubhouse ground floor",
        capacity: 80,
        openingTime: "09:00",
        closingTime: "22:00",
        bookingRules: "Book at least 24 hours in advance. Cleaning charges apply after events.",
        status: "AVAILABLE",
      },
    });
  } else {
    amenity = await prisma.amenity.update({
      where: { id: amenity.id },
      data: {
        type: "EVENT_SPACE",
        description: "Air-conditioned hall for resident meetings, birthdays, and community events.",
        location: "Clubhouse ground floor",
        capacity: 80,
        openingTime: "09:00",
        closingTime: "22:00",
        bookingRules: "Book at least 24 hours in advance. Cleaning charges apply after events.",
        status: "AVAILABLE",
      },
    });
  }

  await findOrCreateBy("amenity", { apartmentId: apartment.id, name: "Badminton Court" }, {
    type: "SPORTS",
    description: "Indoor wooden court with evening lighting.",
    location: "Clubhouse first floor",
    capacity: 4,
    openingTime: "06:00",
    closingTime: "21:00",
    bookingRules: "One-hour slots only. Sports shoes required.",
    status: "AVAILABLE",
  });

  await findOrCreateBy("amenityBooking", { amenityId: amenity.id, residentId: resident.id }, {
    startAt: new Date("2026-06-08T12:30:00.000Z"),
    endAt: new Date("2026-06-08T14:30:00.000Z"),
  });

  await findOrCreateBy("residentFamilyMember", { apartmentId: apartment.id, flatId: flat.id, name: "Anika Nair" }, {
    residentId: resident.id,
    relationship: "Daughter",
    mobileNumber: "9000000011",
    email: "anika.nair@example.com",
    age: 12,
    notes: "School pickup authorized with resident approval.",
    status: "ACTIVE",
  });

  const adultFamilyMember = await findOrCreateBy(
    "residentFamilyMember",
    { apartmentId: apartment.id, flatId: flatTwo.id, name: "Lakshmi Rao" },
    {
      residentId: residentTwo.id,
      relationship: "Mother",
      mobileNumber: "9000000012",
      email: "lakshmi.rao@example.com",
      age: 65,
      notes: "Emergency contact for A-102.",
      status: "ACTIVE",
    }
  );

  await findOrCreateBy("associationMember", { apartmentId: apartment.id, residentId: resident.id }, {
    flatId: flat.id,
    memberName: resident.name,
    committeeRole: "Secretary",
    mobileNumber: resident.mobileNumber,
    email: resident.email,
    termStart: new Date("2026-04-01T00:00:00.000Z"),
    termEnd: new Date("2027-03-31T00:00:00.000Z"),
    status: "ACTIVE",
  });

  await findOrCreateBy("associationMember", { apartmentId: apartment.id, residentId: residentTwo.id }, {
    flatId: flatTwo.id,
    memberName: adultFamilyMember.name,
    committeeRole: "Treasurer",
    mobileNumber: adultFamilyMember.mobileNumber,
    email: adultFamilyMember.email,
    termStart: new Date("2026-04-01T00:00:00.000Z"),
    termEnd: new Date("2027-03-31T00:00:00.000Z"),
    status: "ACTIVE",
  });

  await findOrCreateBy("maintenanceSetting", { apartmentId: apartment.id }, {
    monthlyAmount: 3500,
    billingCycle: "MONTHLY",
    dueDay: 10,
    lateFee: 250,
    notes: "Base maintenance calculated per flat with separate extra charges.",
  });

  await findOrCreateBy("maintenanceBill", { apartmentId: apartment.id, flatId: flat.id, billingMonth: "June 2026" }, {
    residentId: resident.id,
    chargeType: "MONTHLY",
    amount: 3500,
    lateFee: 0,
    dueDate: new Date("2026-06-10T00:00:00.000Z"),
    description: "Monthly maintenance for A-101",
    status: "PAID",
    paidAmount: 3500,
    paymentMode: "UPI",
    receiptNumber: "PP-RCPT-2026-0001",
    paidAt: new Date("2026-06-02T07:30:00.000Z"),
  });

  await findOrCreateBy("maintenanceBill", { apartmentId: apartment.id, flatId: flatTwo.id, billingMonth: "June 2026" }, {
    residentId: residentTwo.id,
    chargeType: "MONTHLY",
    amount: 3900,
    lateFee: 0,
    dueDate: new Date("2026-06-10T00:00:00.000Z"),
    description: "Monthly maintenance for A-102",
    status: "PENDING",
    paidAmount: null,
    paymentMode: null,
    receiptNumber: null,
    paidAt: null,
  });

  await findOrCreateBy("financeEntry", { apartmentId: apartment.id, reference: "INC-MAINT-2026-0001" }, {
    type: "INCOME",
    category: "Maintenance",
    description: "June maintenance received from A-101",
    amount: 3500,
    paymentMode: "UPI",
    entryDate: new Date("2026-06-02T07:30:00.000Z"),
  });

  await findOrCreateBy("financeEntry", { apartmentId: apartment.id, reference: "EXP-HOUSEKEEPING-2026-0001" }, {
    type: "EXPENSE",
    category: "Housekeeping",
    description: "Monthly housekeeping vendor advance",
    amount: 18000,
    paymentMode: "Bank Transfer",
    entryDate: new Date("2026-06-01T05:30:00.000Z"),
  });

  await findOrCreateBy("announcement", { apartmentId: apartment.id, title: "Water tank cleaning on Sunday" }, {
    message: "Water supply will pause from 10 AM to 1 PM during scheduled tank cleaning.",
    category: "Maintenance",
    priority: "HIGH",
    audience: "ALL",
    status: "PUBLISHED",
    mediaType: "image/png",
    mediaName: "water-tank-cleaning.png",
    mediaData: samplePngData,
    publishAt: new Date("2026-06-05T03:30:00.000Z"),
  });

  await findOrCreateBy("apartmentDocument", { apartmentId: apartment.id, title: "Society Registration Certificate" }, {
    flatId: null,
    residentId: null,
    category: "Legal",
    description: "Apartment association registration certificate for admin document screen.",
    fileType: "application/pdf",
    fileName: "society-registration-certificate.pdf",
    fileData: samplePdfData,
    status: "ACTIVE",
    uploadedAt: new Date("2026-05-20T04:30:00.000Z"),
  });

  await findOrCreateBy("apartmentDocument", { apartmentId: apartment.id, title: "A-101 Resident KYC" }, {
    flatId: flat.id,
    residentId: resident.id,
    category: "Resident KYC",
    description: "Resident identity document mapped to flat and resident.",
    fileType: "application/pdf",
    fileName: "a-101-priya-nair-kyc.pdf",
    fileData: samplePdfData,
    status: "ACTIVE",
    uploadedAt: new Date("2026-05-22T06:15:00.000Z"),
  });

  await findOrCreateBy("parkingSlot", { apartmentId: apartment.id, slotNumber: "B1-017" }, {
    flatId: flat.id,
    residentId: resident.id,
    vehicleNumber: "TN-01-AB-1234",
    vehicleType: "Car",
    ownerName: resident.name,
    stickerNumber: "PP-PARK-017",
    status: "ASSIGNED",
    notes: "Basement one slot near lift lobby.",
    assignedAt: new Date("2026-05-12T04:30:00.000Z"),
  });

  await findOrCreateBy("communityTalentProfile", {
    apartmentId: apartment.id,
    residentId: resident.id,
    profileTitle: "Weekend Carnatic Vocal Classes",
  }, {
    flatId: flat.id,
    apartmentName: apartment.name,
    residentName: resident.name,
    flatNumber: flat.number,
    blockName: block.name,
    mainSkill: "Music",
    interestArea: "Teaching",
    description: "Beginner-friendly vocal music sessions for children and adults.",
    status: "ACTIVE",
    featured: true,
    featuredAt: new Date("2026-05-28T04:30:00.000Z"),
    feedbackNotes: "Featured for community learning week.",
    reviewedAt: new Date("2026-05-27T04:30:00.000Z"),
  });

  await findOrCreateBy("visitorRecord", { apartmentId: apartment.id, passCode: "PP-5621" }, {
    residentId: resident.id,
    flatId: flat.id,
    staffId: staff.id,
    staffName: staff.name,
    visitorType: "GUEST",
    visitorName: "Naveen Krishnan",
    mobileNumber: "9000000021",
    purpose: "Dinner visit",
    vehicleNumber: "TN-09-CD-4321",
    visitDate: new Date("2026-06-03T13:30:00.000Z"),
    status: "APPROVED",
    approved: true,
    blocked: false,
    residentName: resident.name,
    residentMobile: resident.mobileNumber,
    flatNumber: flat.number,
    blockName: block.name,
    proofType: "image/jpeg",
    proofName: "visitor-id.jpg",
    proofData: sampleJpegData,
    documentType: "Aadhaar",
    documentNumber: "XXXX-XXXX-1234",
    notes: "Pre-approved by resident.",
    decisionAt: new Date("2026-06-03T09:30:00.000Z"),
    decisionNotes: "Resident approved from app.",
    entryAcceptedAt: new Date("2026-06-03T13:35:00.000Z"),
    exitAcceptedAt: null,
  });

  await findOrCreateBy("emergencyEvent", {
    apartmentId: apartment.id,
    residentId: resident.id,
    message: "Medical assistance requested from A-101.",
  }, {
    flatId: flat.id,
    residentName: resident.name,
    flatLabel: `${block.name} ${flat.number}`,
    mobileNumber: resident.mobileNumber,
    type: "PANIC_ALERT",
    status: "RESPONDED",
    responseMessage: "Security reached the flat and called ambulance support.",
    respondedById: staff.id,
    respondedByName: staff.name,
    respondedByRole: "STAFF",
    respondedAt: new Date("2026-06-01T18:40:00.000Z"),
    triggeredAt: new Date("2026-06-01T18:35:00.000Z"),
  });

  await findOrCreateBy("deliveryRecord", { trackingId: "AMZ-PP-1001" }, {
    partner: "Amazon",
    flat: flat.number,
    residentName: resident.name,
    status: "Received",
    deliveryType: "Package",
    expectedTime: "Today 5:00 PM",
    requestedOn: new Date("2026-06-03T06:30:00.000Z"),
    note: "Leave at security if resident is unavailable.",
    pickupStaffId: staff.id,
    pickupStaffName: staff.name,
    pickupStaffUserId: staff.userId,
    pickupStaffPhone: staff.mobileNumber,
    pickedUpAt: new Date("2026-06-03T10:45:00.000Z"),
    residentReceivedName: resident.name,
    residentReceivedAt: new Date("2026-06-03T11:05:00.000Z"),
  });

  await findOrCreateBy("pet", { name: "Bruno", flat: flat.number }, {
    type: "Dog",
    breed: "Labrador",
    ownerName: resident.name,
    status: "Approved",
    vaccineStatus: "Uploaded",
    documentName: "bruno-vaccination-certificate.pdf",
    documentType: "application/pdf",
    documentData: samplePdfData,
  });

  await findOrCreateBy("petPolicy", { title: "Pet walking and leash policy" }, {
    audience: "All pet owners",
    message: "Pets must be leashed in common areas. Owners should clean up immediately after walks.",
    sentOn: new Date("2026-05-25T04:30:00.000Z"),
  });

  const premiumPlan = await findOrCreateBy("membershipPlan", { name: "Premium Resident Club" }, {
    price: 999,
    billingCycle: "month",
    status: "Active",
    residents: 42,
    description: "Resident club access with priority amenity slots and partner offers.",
    features: ["Priority amenity booking", "Marketplace boosts", "Event discounts"],
  });

  await findOrCreateBy("membershipSubscription", { planId: premiumPlan.id, residentId: resident.id }, {
    status: "Active",
    startedOn: new Date("2026-06-01T00:00:00.000Z"),
  });

  await findOrCreateBy("marketplaceItem", { title: "Wooden study table", seller: residentTwo.name }, {
    category: "Furniture",
    price: 4500,
    status: "Active",
    sellerPhone: residentTwo.mobileNumber,
    sellerAddress: `${block.name}, ${flatTwo.number}`,
    flatId: flatTwo.id,
    postedOn: new Date("2026-05-30T04:30:00.000Z"),
    description: "Six-month-old study table with drawer, suitable for work from home.",
  });

  await findOrCreateBy("smartGatePass", { gate: "Main Gate", visitorName: "Naveen Krishnan", flat: flat.number }, {
    type: "Guest",
    residentName: resident.name,
    status: "Approved",
    requestedOn: new Date("2026-06-03T09:30:00.000Z"),
    expectedTime: "7:00 PM",
    note: "Valid for one entry today.",
  });

  const existingSurvey = await prisma.survey.findFirst({
    where: {
      apartmentId: apartment.id,
      title: "Monthly Facility Feedback",
    },
  });

  const survey =
    existingSurvey ||
    (await prisma.survey.create({
      data: {
        apartmentId: apartment.id,
        title: "Monthly Facility Feedback",
      },
    }));

  const existingSurveyResponse = await prisma.surveyResponse.findFirst({
    where: {
      surveyId: survey.id,
      residentId: resident.id,
    },
  });

  if (!existingSurveyResponse) {
    await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        residentId: resident.id,
        answer: "Facilities are good. Need faster complaint resolution.",
      },
    });
  }

  const existingFaq = await prisma.faqArticle.findFirst({
    where: {
      apartmentId: apartment.id,
      question: "How do I raise a complaint?",
    },
  });

  if (!existingFaq) {
    await prisma.faqArticle.create({
      data: {
        apartmentId: apartment.id,
        question: "How do I raise a complaint?",
        answer: "Open the resident portal, go to Complaints, and submit the issue details.",
      },
    });
  }

  const existingTicket = await prisma.helpdeskTicket.findFirst({
    where: {
      apartmentId: apartment.id,
      residentId: resident.id,
      subject: "Need parking sticker",
    },
  });

  if (!existingTicket) {
    await prisma.helpdeskTicket.create({
      data: {
        apartmentId: apartment.id,
        residentId: resident.id,
        subject: "Need parking sticker",
        description: "Please issue a new parking sticker for vehicle TN-01-AB-1234.",
      },
    });
  }

  console.log("Seed completed");
  console.table([
    {
      role: "SYSTEM_ADMIN",
      email: systemAdmin.email,
      mobileNumber: systemAdmin.mobileNumber,
      password: "password123",
    },
    {
      role: "PROMOTER",
      email: promoter.email,
      mobileNumber: promoter.mobileNumber,
      password: "password123",
    },
    {
      role: "LOCATION_ADMIN",
      email: locationAdmin.email,
      mobileNumber: locationAdmin.mobileNumber,
      password: "password123",
    },
    {
      role: "APARTMENT_ADMIN",
      email: apartmentAdmin.email,
      mobileNumber: apartmentAdmin.mobileNumber,
      password: "password123",
    },
    {
      role: "RESIDENT",
      email: resident.email,
      mobileNumber: resident.mobileNumber,
      password: "password123",
    },
    {
      role: "RESIDENT",
      email: residentTwo.email,
      mobileNumber: residentTwo.mobileNumber,
      password: "password123",
    },
    {
      role: "STAFF",
      email: staff.email,
      mobileNumber: staff.mobileNumber,
      password: "password123",
    },
    {
      role: "STAFF",
      email: electrician.email,
      mobileNumber: electrician.mobileNumber,
      password: "password123",
    },
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
