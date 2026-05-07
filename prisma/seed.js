const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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
    },
  });
}

async function main() {
  await upsertRoles();

  const location = await findOrCreateLocation("Chennai South");
  const apartment = await findOrCreateApartment("Prestige Palms", location.id);
  const block = await findOrCreateBlock("A Block", apartment.id);
  const flat = await findOrCreateFlat("A-101", apartment.id, block.id);

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
  });

  const existingComplaint = await prisma.complaint.findFirst({
    where: {
      title: "Water leakage in kitchen",
      apartmentId: apartment.id,
      residentId: resident.id,
    },
  });

  if (!existingComplaint) {
    await prisma.complaint.create({
      data: {
        title: "Water leakage in kitchen",
        description: "Tap leakage needs plumber visit.",
        status: "ASSIGNED",
        apartmentId: apartment.id,
        flatId: flat.id,
        residentId: resident.id,
        assignedStaffId: staff.id,
      },
    });
  }

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
      },
    });
  }

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
      role: "RESIDENT",
      email: resident.email,
      mobileNumber: resident.mobileNumber,
      password: "password123",
    },
    {
      role: "STAFF",
      email: staff.email,
      mobileNumber: staff.mobileNumber,
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
