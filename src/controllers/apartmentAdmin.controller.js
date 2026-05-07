const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { getRoleId, roleWhere } = require("../utils/roles");
const { generateUserId } = require("../utils/userId");

const prisma = new PrismaClient();

exports.getDashboard = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;
    const where = apartmentId ? { apartmentId } : undefined;
    const [totalBlocks, totalFlats, totalResidents, totalComplaints, openComplaints] = await Promise.all([
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
    ]);
    res.json({
      data: {
        totalBlocks,
        totalFlats,
        totalResidents,
        totalComplaints,
        openComplaints,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.createBlockOrFlat = async (req, res, next) => {
  try {
    const { apartmentId, blockName, flatNumber, blockId } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { id: true, totalBlocks: true, totalFlats: true },
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

      const block = await prisma.block.create({ data: { name: blockName, apartmentId } });
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
      data: { number: flatNumber, apartmentId, blockId: blockId || null },
    });

    res.status(201).json({ data: flat, message: "flat created" });
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
      },
    });

    res.json({ data: residents, message: "success" });
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
      memberName,
      committeeRole,
      mobileNumber,
      email,
      termStart,
      termEnd,
      status,
    } = req.body;

    if (!apartmentId || !memberName) {
      return res.status(400).json({ message: "apartmentId and memberName are required" });
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

    const member = await prisma.associationMember.create({
      data: {
        apartmentId,
        flatId: flatId || null,
        memberName,
        committeeRole: committeeRole || "Member",
        mobileNumber: mobileNumber || null,
        email: email || null,
        termStart: termStart ? new Date(termStart) : null,
        termEnd: termEnd ? new Date(termEnd) : null,
        status: status || "ACTIVE",
      },
      include: {
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
