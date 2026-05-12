const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { getRoleId, roleWhere } = require("../utils/roles");
const { generateUserId } = require("../utils/userId");

const prisma = new PrismaClient();
const ASSOCIATION_COMMITTEE_ROLES = new Set([
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Committee Member",
]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeResidentType(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (["OWNER", "TENANT", "FAMILY"].includes(normalized)) {
    return normalized;
  }

  return "OWNER";
}

function defaultResidentPassword(mobileNumber) {
  return String(mobileNumber || "").trim();
}

async function createOrLinkResidentAccount({
  name,
  mobileNumber,
  email,
  apartmentId,
  locationId,
  flatId,
  residentType,
  onboardingFlow,
}) {
  const resolvedName = cleanText(name);
  const resolvedMobileNumber = cleanText(mobileNumber);
  const resolvedEmail = cleanText(email);

  if (!resolvedName || !resolvedMobileNumber) {
    return null;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { mobileNumber: resolvedMobileNumber },
        ...(resolvedEmail ? [{ email: resolvedEmail }] : []),
      ],
    },
    select: { id: true },
  });

  if (existingUser) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: resolvedName,
        email: resolvedEmail || null,
        apartmentId,
        locationId: locationId || null,
        flatId: flatId || null,
        residentType: normalizeResidentType(residentType),
        accountStatus: "ACTIVE",
      },
      select: {
        id: true,
        userId: true,
        name: true,
        mobileNumber: true,
        email: true,
        residentType: true,
      },
    });
  }

  const [hashedPassword, userId, roleId] = await Promise.all([
    bcrypt.hash(defaultResidentPassword(resolvedMobileNumber), 10),
    generateUserId(),
    getRoleId("RESIDENT"),
  ]);

  return prisma.user.create({
    data: {
      userId,
      name: resolvedName,
      mobileNumber: resolvedMobileNumber,
      email: resolvedEmail || null,
      password: hashedPassword,
      roleId,
      locationId: locationId || null,
      apartmentId,
      flatId: flatId || null,
      residentType: normalizeResidentType(residentType),
      accountStatus: "ACTIVE",
      onboardingFlow: onboardingFlow || "AUTO_CREATED_FROM_FLAT",
    },
    select: {
      id: true,
      userId: true,
      name: true,
      mobileNumber: true,
      email: true,
      residentType: true,
    },
  });
}

function normalizeFamilyMembers(value) {
  return Array.isArray(value)
    ? value
        .map((member) => ({
          name: cleanText(member?.name),
          relationship: cleanText(member?.relationship),
          mobileNumber: cleanText(member?.mobileNumber),
          email: cleanText(member?.email),
          age: member?.age === undefined || member?.age === "" ? null : Number(member.age),
          notes: cleanText(member?.notes),
        }))
        .filter((member) => member.name)
    : [];
}

async function createFamilyMembers({ apartmentId, flatId, residentId, familyMembers }) {
  const normalizedMembers = normalizeFamilyMembers(familyMembers);

  if (!flatId || !normalizedMembers.length) {
    return [];
  }

  return Promise.all(
    normalizedMembers.map((member) =>
      prisma.residentFamilyMember.create({
        data: {
          apartmentId,
          flatId,
          residentId: residentId || null,
          name: member.name,
          relationship: member.relationship || null,
          mobileNumber: member.mobileNumber || null,
          email: member.email || null,
          age: Number.isFinite(member.age) ? member.age : null,
          notes: member.notes || null,
        },
      })
    )
  );
}

exports.getDashboard = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;
    const where = apartmentId ? { apartmentId } : undefined;
    const [
      totalBlocks,
      totalFlats,
      totalResidents,
      totalComplaints,
      openComplaints,
      staffTickets,
      maintenanceDue,
      financeEntries,
    ] = await Promise.all([
      prisma.block.count({ where }),
      prisma.flat.count({ where }),
      prisma.user.count({ where: apartmentId ? { apartmentId, ...roleWhere("RESIDENT") } : roleWhere("RESIDENT") }),
      prisma.complaint.count({ where }),
      prisma.complaint.count({
        where: {
          ...(where || {}),
          status: {
            in: ["OPEN", "ASSIGNED"],
          },
        },
      }),
      prisma.complaint.count({
        where: {
          ...(where || {}),
          assignedStaffId: {
            not: null,
          },
          status: {
            in: ["ASSIGNED", "WORKED"],
          },
        },
      }),
      prisma.maintenanceBill.aggregate({
        where: {
          ...(where || {}),
          status: {
            not: "PAID",
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.financeEntry.count({ where }),
    ]);
    res.json({
      data: {
        totalBlocks,
        totalFlats,
        totalResidents,
        totalComplaints,
        openComplaints,
        staffTickets,
        maintenanceDue: maintenanceDue._sum.amount || 0,
        financeEntries,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.createBlockOrFlat = async (req, res, next) => {
  try {
    const {
      apartmentId,
      blockName,
      blockCode,
      floorCount,
      blockStatus,
      blockNotes,
      flatNumber,
      blockId,
      squareFeet,
      floorNumber,
      bedroomCount,
      bathroomCount,
      facing,
      flatType,
      occupancyStatus,
      occupantName,
      occupantPhone,
      occupantEmail,
      tenantName,
      tenantPhone,
      tenantEmail,
      tenantStart,
      tenantEnd,
      flatNotes,
    } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { id: true, locationId: true, totalBlocks: true, totalFlats: true },
    });

    if (!apartment) {
      return res.status(404).json({ message: "Apartment was not found" });
    }

    if (blockName && !flatNumber) {
      const existingBlocks = await prisma.block.count({ where: { apartmentId } });

      if (apartment.totalBlocks !== null && existingBlocks >= apartment.totalBlocks) {
        return res.status(400).json({
          message: `Block limit reached. This apartment allows only ${apartment.totalBlocks} blocks.`,
        });
      }

      const existingBlock = await prisma.block.findFirst({
        where: { apartmentId, name: blockName },
        select: { id: true },
      });

      if (existingBlock) {
        return res.status(409).json({ message: "Block with this name already exists" });
      }

      const block = await prisma.block.create({
        data: {
          name: blockName,
          code: blockCode || null,
          floorCount: floorCount ? Number(floorCount) : null,
          status: blockStatus || "ACTIVE",
          notes: blockNotes || null,
          apartmentId,
        },
      });
      return res.status(201).json({ data: block, message: "block created" });
    }

    if (!flatNumber) {
      return res.status(400).json({ message: "flatNumber is required" });
    }

    const existingFlats = await prisma.flat.count({ where: { apartmentId } });

    if (apartment.totalFlats !== null && existingFlats >= apartment.totalFlats) {
      return res.status(400).json({
        message: `Flat limit reached. This apartment allows only ${apartment.totalFlats} flats.`,
      });
    }

    if (blockId) {
      const block = await prisma.block.findFirst({
        where: { id: blockId, apartmentId },
        select: { id: true },
      });

      if (!block) {
        return res.status(404).json({ message: "Selected block was not found for this apartment" });
      }
    }

    const existingFlat = await prisma.flat.findFirst({
      where: { apartmentId, number: flatNumber },
      select: { id: true },
    });

    if (existingFlat) {
      return res.status(409).json({ message: "Flat with this number already exists" });
    }

    const flat = await prisma.flat.create({
      data: {
        number: flatNumber,
        squareFeet: squareFeet ? Number(squareFeet) : null,
        floorNumber: floorNumber ? Number(floorNumber) : null,
        bedroomCount: bedroomCount ? Number(bedroomCount) : null,
        bathroomCount: bathroomCount ? Number(bathroomCount) : null,
        facing: facing || null,
        flatType: flatType || null,
        occupancyStatus: occupancyStatus || "VACANT",
        occupantName: occupantName || null,
        occupantPhone: occupantPhone || null,
        occupantEmail: occupantEmail || null,
        tenantName: tenantName || null,
        tenantPhone: tenantPhone || null,
        tenantEmail: tenantEmail || null,
        tenantStart: tenantStart ? new Date(tenantStart) : null,
        tenantEnd: tenantEnd ? new Date(tenantEnd) : null,
        notes: flatNotes || null,
        apartmentId,
        blockId: blockId || null,
      },
    });

    const [occupantResident, tenantResident] = await Promise.all([
      createOrLinkResidentAccount({
        name: occupantName,
        mobileNumber: occupantPhone,
        email: occupantEmail,
        apartmentId,
        locationId: apartment.locationId,
        flatId: flat.id,
        residentType: "OWNER",
        onboardingFlow: "AUTO_CREATED_FROM_FLAT_OCCUPANT",
      }),
      createOrLinkResidentAccount({
        name: tenantName,
        mobileNumber: tenantPhone,
        email: tenantEmail,
        apartmentId,
        locationId: apartment.locationId,
        flatId: flat.id,
        residentType: "TENANT",
        onboardingFlow: "AUTO_CREATED_FROM_FLAT_TENANT",
      }),
    ]);

    res.status(201).json({
      data: {
        ...flat,
        occupantResident,
        tenantResident,
      },
      message: [occupantResident, tenantResident].filter(Boolean).length
        ? "flat created and resident records saved"
        : "flat created",
    });
  } catch (error) {
    next(error);
  }
};

exports.getBlocks = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const blocks = await prisma.block.findMany({
      where: { apartmentId },
      orderBy: { name: "asc" },
    });

    res.json({ data: blocks, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.getBlockFlatInventory = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: {
        id: true,
        name: true,
        totalBlocks: true,
        totalFlats: true,
      },
    });

    if (!apartment) {
      return res.status(404).json({ message: "Apartment was not found" });
    }

    const [blocks, flats] = await Promise.all([
      prisma.block.findMany({
        where: { apartmentId },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { flats: true },
          },
        },
      }),
      prisma.flat.findMany({
        where: { apartmentId },
        orderBy: { number: "asc" },
        include: {
          block: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
      }),
    ]);

    res.json({
      data: {
        apartment,
        blocks,
        flats,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getResidents = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const residents = await prisma.user.findMany({
      where: {
        apartmentId,
        ...roleWhere("RESIDENT"),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        name: true,
        mobileNumber: true,
        email: true,
        accountStatus: true,
        residentType: true,
        createdAt: true,
        flat: {
          select: {
            id: true,
            number: true,
            block: {
              select: {
                name: true,
              },
            },
          },
        },
        familyMembers: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            relationship: true,
            mobileNumber: true,
            email: true,
            age: true,
            status: true,
          },
        },
      },
    });

    res.json({ data: residents, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createResident = async (req, res, next) => {
  try {
    const {
      apartmentId,
      locationId,
      flatId,
      name,
      mobileNumber,
      email,
      password,
      residentType,
      familyMembers,
    } = req.body;

    if (!apartmentId || !name || !mobileNumber || !password) {
      return res.status(400).json({ message: "apartmentId, name, mobileNumber, and password are required" });
    }

    if (flatId) {
      const flat = await prisma.flat.findFirst({
        where: { id: flatId, apartmentId },
        select: { id: true },
      });

      if (!flat) {
        return res.status(404).json({ message: "Selected flat was not found for this apartment" });
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { mobileNumber: cleanText(mobileNumber) },
          ...(cleanText(email) ? [{ email: cleanText(email) }] : []),
        ],
      },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User with this mobile number or email already exists" });
    }

    const [hashedPassword, userId, roleId] = await Promise.all([
      bcrypt.hash(password, 10),
      generateUserId(),
      getRoleId("RESIDENT"),
    ]);

    const resident = await prisma.user.create({
      data: {
        userId,
        name: cleanText(name),
        mobileNumber: cleanText(mobileNumber),
        email: cleanText(email) || null,
        password: hashedPassword,
        roleId,
        locationId: locationId || null,
        apartmentId,
        flatId: flatId || null,
        residentType: normalizeResidentType(residentType),
        accountStatus: "ACTIVE",
        onboardingFlow: "MANUAL_RESIDENT",
      },
      select: {
        id: true,
        userId: true,
        name: true,
        mobileNumber: true,
        email: true,
        residentType: true,
        flatId: true,
      },
    });

    const savedFamilyMembers = await createFamilyMembers({
      apartmentId,
      flatId: flatId || null,
      residentId: resident.id,
      familyMembers,
    });

    res.status(201).json({
      data: {
        resident,
        familyMembers: savedFamilyMembers,
      },
      message: savedFamilyMembers.length
        ? "resident and family members saved"
        : "resident saved",
    });
  } catch (error) {
    next(error);
  }
};

exports.getAssociationMembers = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const members = await prisma.associationMember.findMany({
      where: { apartmentId },
      orderBy: { createdAt: "desc" },
      include: {
        resident: {
          select: {
            id: true,
            userId: true,
            name: true,
            mobileNumber: true,
            email: true,
          },
        },
        flat: {
          select: {
            number: true,
            block: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({ data: members, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.getComplaints = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const complaints = await prisma.complaint.findMany({
      where: { apartmentId },
      orderBy: { createdAt: "desc" },
      include: {
        resident: {
          select: {
            userId: true,
            name: true,
            mobileNumber: true,
          },
        },
        flat: {
          select: {
            number: true,
            block: {
              select: { name: true },
            },
          },
        },
        assignedStaff: {
          select: {
            userId: true,
            name: true,
            mobileNumber: true,
          },
        },
      },
    });

    res.json({ data: complaints, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.getStaff = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const staff = await prisma.user.findMany({
      where: {
        apartmentId,
        ...roleWhere("STAFF"),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        name: true,
        mobileNumber: true,
        email: true,
        accessLevel: true,
        accountStatus: true,
        onboardingFlow: true,
        proofDocumentType: true,
        proofDocumentName: true,
        createdAt: true,
        _count: {
          select: {
            assignedComplaints: true,
          },
        },
      },
    });

    res.json({ data: staff, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createStaff = async (req, res, next) => {
  try {
    const {
      apartmentId,
      locationId,
      name,
      mobileNumber,
      email,
      password,
      accessLevel,
      accountStatus,
      onboardingFlow,
      proofDocumentType,
      proofDocumentName,
      proofDocumentData,
    } = req.body;

    if (!apartmentId || !name || !mobileNumber || !password) {
      return res.status(400).json({ message: "apartmentId, name, mobileNumber, and password are required" });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { id: true, locationId: true },
    });

    if (!apartment) {
      return res.status(404).json({ message: "Apartment was not found" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { mobileNumber },
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User with this mobile number or email already exists" });
    }

    const [hashedPassword, userId, roleId] = await Promise.all([
      bcrypt.hash(password, 10),
      generateUserId(),
      getRoleId("STAFF"),
    ]);

    const staff = await prisma.user.create({
      data: {
        userId,
        name,
        mobileNumber,
        email: email || null,
        password: hashedPassword,
        roleId,
        locationId: locationId || apartment.locationId,
        apartmentId,
        accessLevel: accessLevel || "Facility Staff",
        accountStatus: accountStatus || "ACTIVE",
        onboardingFlow: onboardingFlow || null,
        proofDocumentType: proofDocumentType || null,
        proofDocumentName: proofDocumentName || null,
        proofDocumentData: proofDocumentData || null,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        mobileNumber: true,
        email: true,
        accessLevel: true,
        accountStatus: true,
        onboardingFlow: true,
        proofDocumentType: true,
        proofDocumentName: true,
        createdAt: true,
      },
    });

    res.status(201).json({ data: staff, message: "staff created" });
  } catch (error) {
    next(error);
  }
};

exports.createAssociationMember = async (req, res, next) => {
  try {
    const {
      apartmentId,
      flatId,
      residentId,
      memberName,
      committeeRole,
      mobileNumber,
      email,
      termStart,
      termEnd,
      status,
    } = req.body;

    if (!apartmentId || !residentId) {
      return res.status(400).json({ message: "apartmentId and residentId are required" });
    }

    const resolvedCommitteeRole = committeeRole || "Committee Member";
    if (!ASSOCIATION_COMMITTEE_ROLES.has(resolvedCommitteeRole)) {
      return res.status(400).json({
        message: "Committee role must be President, Vice President, Secretary, Treasurer, or Committee Member.",
      });
    }

    const resident = await prisma.user.findFirst({
      where: {
        id: residentId,
        apartmentId,
        ...roleWhere("RESIDENT"),
      },
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        email: true,
        flatId: true,
      },
    });

    if (!resident) {
      return res.status(404).json({ message: "Selected resident was not found for this apartment" });
    }

    const resolvedFlatId = flatId || resident.flatId;

    if (resolvedFlatId) {
      const flat = await prisma.flat.findFirst({
        where: { id: resolvedFlatId, apartmentId },
        select: { id: true },
      });

      if (!flat) {
        return res.status(404).json({ message: "Selected resident flat was not found for this apartment" });
      }
    }

    const member = await prisma.associationMember.create({
      data: {
        apartmentId,
        flatId: resolvedFlatId || null,
        residentId: resident.id,
        memberName: resident.name,
        committeeRole: resolvedCommitteeRole,
        mobileNumber: resident.mobileNumber || mobileNumber || null,
        email: resident.email || email || null,
        termStart: termStart ? new Date(termStart) : null,
        termEnd: termEnd ? new Date(termEnd) : null,
        status: status || "ACTIVE",
      },
      include: {
        resident: {
          select: {
            id: true,
            userId: true,
            name: true,
            mobileNumber: true,
            email: true,
          },
        },
        flat: {
          select: {
            number: true,
            block: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ data: member, message: "association member created" });
  } catch (error) {
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const documents = await prisma.apartmentDocument.findMany({
      where: { apartmentId },
      orderBy: { uploadedAt: "desc" },
    });

    res.json({ data: documents, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createDocument = async (req, res, next) => {
  try {
    const { apartmentId, title, category, description, fileType, fileName, fileData, status } = req.body;

    if (!apartmentId || !title) {
      return res.status(400).json({ message: "apartmentId and title are required" });
    }

    const document = await prisma.apartmentDocument.create({
      data: {
        apartmentId,
        title,
        category: category || null,
        description: description || null,
        fileType: fileType || null,
        fileName: fileName || null,
        fileData: fileData || null,
        status: status || "ACTIVE",
      },
    });

    res.status(201).json({ data: document, message: "document uploaded" });
  } catch (error) {
    next(error);
  }
};

exports.getParkingSlots = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const slots = await prisma.parkingSlot.findMany({
      where: { apartmentId },
      orderBy: { assignedAt: "desc" },
      include: {
        resident: {
          select: {
            userId: true,
            name: true,
            mobileNumber: true,
          },
        },
        flat: {
          select: {
            number: true,
            block: {
              select: { name: true },
            },
          },
        },
      },
    });

    res.json({ data: slots, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createParkingSlot = async (req, res, next) => {
  try {
    const {
      apartmentId,
      flatId,
      residentId,
      slotNumber,
      vehicleNumber,
      vehicleType,
      ownerName,
      stickerNumber,
      status,
      notes,
    } = req.body;

    if (!apartmentId || !slotNumber) {
      return res.status(400).json({ message: "apartmentId and slotNumber are required" });
    }

    if (flatId) {
      const flat = await prisma.flat.findFirst({
        where: { id: flatId, apartmentId },
        select: { id: true },
      });

      if (!flat) {
        return res.status(404).json({ message: "Selected flat was not found for this apartment" });
      }
    }

    if (residentId) {
      const resident = await prisma.user.findFirst({
        where: { id: residentId, apartmentId },
        select: { id: true },
      });

      if (!resident) {
        return res.status(404).json({ message: "Selected resident was not found for this apartment" });
      }
    }

    const slot = await prisma.parkingSlot.create({
      data: {
        apartmentId,
        flatId: flatId || null,
        residentId: residentId || null,
        slotNumber,
        vehicleNumber: vehicleNumber || null,
        vehicleType: vehicleType || null,
        ownerName: ownerName || null,
        stickerNumber: stickerNumber || null,
        status: status || "ASSIGNED",
        notes: notes || null,
      },
      include: {
        resident: {
          select: {
            userId: true,
            name: true,
            mobileNumber: true,
          },
        },
        flat: {
          select: {
            number: true,
            block: {
              select: { name: true },
            },
          },
        },
      },
    });

    res.status(201).json({ data: slot, message: "parking slot assigned" });
  } catch (error) {
    next(error);
  }
};

exports.generateMaintenance = async (_req, res) => {
  res.json({ data: { generated: true }, message: "maintenance generation placeholder completed" });
};
