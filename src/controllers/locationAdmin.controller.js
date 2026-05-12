const { PrismaClient } = require("@prisma/client");
const { prepareAdminUser, serializeProvisionedUser } = require("../utils/provisionAdminUser");
const { roleWhere } = require("../utils/roles");

const prisma = new PrismaClient();

exports.getDashboard = async (req, res, next) => {
  try {
    const locationId = req.query.locationId || req.user?.locationId;
    const apartmentWhere = locationId ? { locationId } : undefined;
    const apartmentRelationWhere = locationId ? { apartment: { locationId } } : undefined;

    const [managedApartments, activeResidents, openComplaints, pendingBills, financeEntries] = await Promise.all([
      prisma.apartment.count({ where: apartmentWhere }),
      prisma.user.count({
        where: {
          ...roleWhere("RESIDENT"),
          apartment: apartmentWhere,
        },
      }),
      prisma.complaint.count({
        where: {
          ...(apartmentRelationWhere || {}),
          status: {
            in: ["OPEN", "ASSIGNED", "WORKED"],
          },
        },
      }),
      prisma.maintenanceBill.count({
        where: {
          ...(apartmentRelationWhere || {}),
          status: {
            not: "PAID",
          },
        },
      }),
      prisma.financeEntry.count({ where: apartmentRelationWhere }),
    ]);

    res.json({
      data: {
        managedApartments,
        activeResidents,
        criticalAlerts: openComplaints + pendingBills,
        openReports: financeEntries + openComplaints,
        openComplaints,
        pendingBills,
        financeEntries,
      },
      message: "success",
    });
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

exports.getReports = async (req, res, next) => {
  try {
    const locationId = req.query.locationId || req.user?.locationId;
    const locationWhere = locationId ? { id: locationId } : undefined;
    const apartmentWhere = locationId ? { locationId } : undefined;
    const apartmentRelationWhere = locationId
      ? {
          apartment: {
            locationId,
          },
        }
      : undefined;

    const [
      totalLocations,
      totalApartments,
      totalSubscriptions,
      totalComplaints,
      financeTotal,
      resolvedComplaints,
      paidBills,
      totalBills,
      reportApartments,
    ] = await Promise.all([
      prisma.location.count({ where: locationWhere }),
      prisma.apartment.count({ where: apartmentWhere }),
      prisma.apartment.count({
        where: {
          ...(apartmentWhere || {}),
          subscriptionPlan: {
            not: null,
          },
        },
      }),
      prisma.complaint.count({ where: apartmentRelationWhere }),
      prisma.financeEntry.aggregate({
        where: apartmentRelationWhere,
        _sum: {
          amount: true,
        },
      }),
      prisma.complaint.count({
        where: {
          ...(apartmentRelationWhere || {}),
          status: {
            in: ["RESOLVED", "COMPLETED", "CLOSED"],
          },
        },
      }),
      prisma.maintenanceBill.count({
        where: {
          ...(apartmentRelationWhere || {}),
          status: "PAID",
        },
      }),
      prisma.maintenanceBill.count({ where: apartmentRelationWhere }),
      prisma.apartment.findMany({
        where: apartmentWhere,
        select: {
          id: true,
          name: true,
          subscriptionPlan: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      data: {
        totalApartments,
        totalLocations,
        totalSubscriptions,
        totalComplaints,
        totalFinance: financeTotal._sum.amount || 0,
        resolvedComplaints,
        paidBills,
        totalBills,
        paymentSuccessPercent: totalBills ? Math.round((paidBills / totalBills) * 100) : 0,
        complaintResolutionPercent: totalComplaints ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0,
        apartments: reportApartments,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getActivities = async (req, res, next) => {
  try {
    const locationId = req.query.locationId || req.user?.locationId;
    const apartmentRelationWhere = locationId ? { apartment: { locationId } } : undefined;

    const [complaintUpdates, financeEvents, announcements, helpdeskTickets] = await Promise.all([
      prisma.complaint.count({ where: apartmentRelationWhere }),
      prisma.financeEntry.count({ where: apartmentRelationWhere }),
      prisma.announcement.count({ where: apartmentRelationWhere }),
      prisma.helpdeskTicket.count({ where: apartmentRelationWhere }),
    ]);

    const recentComplaints = await prisma.complaint.findMany({
      where: apartmentRelationWhere,
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        apartment: { select: { name: true } },
      },
    });

    res.json({
      data: {
        activityEvents: complaintUpdates + financeEvents + announcements + helpdeskTickets,
        complaintUpdates,
        financeEvents,
        announcements,
        helpdeskTickets,
        recentComplaints,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getAlerts = async (req, res, next) => {
  try {
    const locationId = req.query.locationId || req.user?.locationId;
    const apartmentRelationWhere = locationId ? { apartment: { locationId } } : undefined;

    const [emergencyAlerts, slaBreaches, financeRisks, securityFlags, recentOpenComplaints] = await Promise.all([
      prisma.complaint.count({
        where: {
          ...(apartmentRelationWhere || {}),
          status: "OPEN",
        },
      }),
      prisma.complaint.count({
        where: {
          ...(apartmentRelationWhere || {}),
          status: {
            in: ["ASSIGNED", "WORKED"],
          },
        },
      }),
      prisma.maintenanceBill.count({
        where: {
          ...(apartmentRelationWhere || {}),
          status: {
            not: "PAID",
          },
        },
      }),
      prisma.helpdeskTicket.count({
        where: {
          ...(apartmentRelationWhere || {}),
          status: "OPEN",
        },
      }),
      prisma.complaint.findMany({
        where: {
          ...(apartmentRelationWhere || {}),
          status: {
            in: ["OPEN", "ASSIGNED", "WORKED"],
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          apartment: { select: { name: true } },
        },
      }),
    ]);

    res.json({
      data: {
        emergencyAlerts,
        slaBreaches,
        financeRisks,
        securityFlags,
        recentOpenComplaints,
      },
      message: "success",
    });
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
