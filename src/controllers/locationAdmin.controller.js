const { PrismaClient } = require("@prisma/client");
const { prepareAdminUser, serializeProvisionedUser } = require("../utils/provisionAdminUser");

const prisma = new PrismaClient();

exports.getDashboard = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const apartments = await prisma.apartment.count({ where: locationId ? { locationId } : undefined });
    res.json({ data: { apartments }, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.getApartments = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const apartments = await prisma.apartment.findMany({
      where: locationId ? { locationId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        location: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({ data: apartments, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createApartment = async (req, res, next) => {
  try {
    const {
      name,
      code,
      locationId,
      address,
      city,
      state,
      pincode,
      totalBlocks,
      totalFlats,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
      subscriptionPlan,
      onboardingStatus,
      status,
    } = req.body;

    if (!name || !locationId) {
      return res.status(400).json({ message: "name and locationId are required" });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });

    if (!location) {
      return res.status(404).json({ message: "Selected location was not found" });
    }

    const preparedAdminUser = await prepareAdminUser({
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
      roleName: "APARTMENT_ADMIN",
      locationId,
      organizationName: name,
      assignedRegion: city || state,
      accountStatus: status,
      onboardingFlow: onboardingStatus || "APARTMENT_CREATED",
    });

    const { apartment, user } = await prisma.$transaction(async (tx) => {
      const createdApartment = await tx.apartment.create({
        data: {
          name,
          code: code || null,
          locationId,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          totalBlocks: totalBlocks ? Number(totalBlocks) : null,
          totalFlats: totalFlats ? Number(totalFlats) : null,
          adminName: adminName || null,
          adminEmail: adminEmail || null,
          adminPhone: adminPhone || null,
          subscriptionPlan: subscriptionPlan || null,
          onboardingStatus: onboardingStatus || null,
          status: status || "ACTIVE",
        },
      });

      const createdUser = preparedAdminUser
        ? await tx.user.create({
            data: {
              ...preparedAdminUser,
              apartmentId: createdApartment.id,
            },
          })
        : null;

      return { apartment: createdApartment, user: createdUser };
    });

    res.status(201).json({
      data: {
        ...apartment,
        adminUser: serializeProvisionedUser(user),
      },
      message: user ? "apartment and admin user created" : "apartment created",
    });
  } catch (error) {
    next(error);
  }
};
