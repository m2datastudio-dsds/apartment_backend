const { PrismaClient } = require("@prisma/client");
const { roleWhere } = require("../utils/roles");
const { prepareAdminUser, serializeProvisionedUser } = require("../utils/provisionAdminUser");

const prisma = new PrismaClient();

exports.getDashboard = async (_req, res, next) => {
  try {
    const promoterId = _req.user.id;
    const [totalLocations, totalApartments, totalResidents] = await Promise.all([
      prisma.location.count({ where: { promoterId } }),
      prisma.apartment.count({ where: { location: { promoterId } } }),
      prisma.user.count({
        where: {
          ...roleWhere("RESIDENT"),
          apartment: {
            location: {
              promoterId,
            },
          },
        },
      }),
    ]);
    res.json({ data: { totalLocations, totalApartments, totalResidents }, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createLocation = async (req, res, next) => {
  try {
    const promoterId = req.user.id;
    const {
      name,
      code,
      region,
      address,
      city,
      state,
      country,
      pincode,
      timezone,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const promoter = await prisma.user.findUnique({
      where: { id: promoterId },
      select: { onboardingFlow: true },
    });
    const locationOnboardingFlow = promoter?.onboardingFlow === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS";

    const preparedAdminUser = await prepareAdminUser({
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
      roleName: "LOCATION_ADMIN",
      organizationName: name,
      assignedRegion: region || city || state,
      accountStatus: "ACTIVE",
      onboardingFlow: locationOnboardingFlow,
    });

    const { location, user } = await prisma.$transaction(async (tx) => {
      const createdLocation = await tx.location.create({
        data: {
          name,
          code: code || null,
          region: region || null,
          address: address || null,
          city: city || null,
          state: state || null,
          country: country || null,
          pincode: pincode || null,
          timezone: timezone || null,
          adminName: adminName || null,
          adminEmail: adminEmail || null,
          adminPhone: adminPhone || null,
          status: "ACTIVE",
          promoterId,
        },
      });

      await tx.user.update({
        where: { id: promoterId },
        data: { onboardingFlow: locationOnboardingFlow },
      });

      const createdUser = preparedAdminUser
        ? await tx.user.create({
            data: {
              ...preparedAdminUser,
              locationId: createdLocation.id,
            },
          })
        : null;

      return { location: createdLocation, user: createdUser };
    });

    res.status(201).json({
      data: {
        ...location,
        adminUser: serializeProvisionedUser(user),
      },
      message: user ? "location and admin user created" : "location created",
    });
  } catch (error) {
    next(error);
  }
};

exports.getLocations = async (_req, res, next) => {
  try {
    const promoterId = _req.user.id;
    const locations = await prisma.location.findMany({
      where: { promoterId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            apartments: true,
          },
        },
      },
    });

    res.json({ data: locations, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createApartment = async (req, res, next) => {
  try {
    const promoterId = req.user.id;
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

    const location = await prisma.location.findFirst({
      where: { id: locationId, promoterId },
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
      accountStatus: "ACTIVE",
      onboardingFlow: "COMPLETED",
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
          onboardingStatus: onboardingStatus || "COMPLETED",
          status: status || "ACTIVE",
        },
      });

      await tx.user.update({
        where: { id: promoterId },
        data: { onboardingFlow: "COMPLETED" },
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

exports.getApartments = async (_req, res, next) => {
  try {
    const promoterId = _req.user.id;
    const apartments = await prisma.apartment.findMany({
      where: {
        location: {
          promoterId,
        },
      },
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
