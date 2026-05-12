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

exports.getReports = async (_req, res, next) => {
  try {
    const promoterId = _req.user.id;
    const apartmentScope = {
      location: {
        promoterId,
      },
    };
    const scopedApartmentRelation = {
      apartment: apartmentScope,
    };

    const [
      totalLocations,
      totalApartments,
      totalSubscriptions,
      totalComplaints,
      financeTotal,
      reportApartments,
      complaintStatusGroups,
    ] = await Promise.all([
      prisma.location.count({ where: { promoterId } }),
      prisma.apartment.count({ where: apartmentScope }),
      prisma.apartment.count({
        where: {
          ...apartmentScope,
          subscriptionPlan: {
            not: null,
          },
        },
      }),
      prisma.complaint.count({ where: scopedApartmentRelation }),
      prisma.financeEntry.aggregate({
        where: scopedApartmentRelation,
        _sum: {
          amount: true,
        },
      }),
      prisma.apartment.findMany({
        where: apartmentScope,
        select: {
          id: true,
          createdAt: true,
          subscriptionPlan: true,
          location: {
            select: {
              city: true,
              name: true,
            },
          },
        },
      }),
      prisma.complaint.groupBy({
        by: ["status"],
        where: scopedApartmentRelation,
        _count: {
          _all: true,
        },
      }),
    ]);

    const cityCounts = reportApartments.reduce((counts, apartment) => {
      const city = apartment.location?.city || apartment.location?.name || "Unknown";
      counts[city] = (counts[city] || 0) + 1;
      return counts;
    }, {});
    const cityWiseApartments = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((left, right) => right.count - left.count);

    const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
    const monthlyCounts = reportApartments.reduce((counts, apartment) => {
      const date = new Date(apartment.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      counts[key] = {
        month: monthFormatter.format(date),
        sortKey: key,
        count: (counts[key]?.count || 0) + 1,
      };
      return counts;
    }, {});
    const monthlyGrowth = Object.values(monthlyCounts)
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
      .slice(-6)
      .map(({ month, count }) => ({ month, count }));

    const subscriptionCounts = reportApartments.reduce((counts, apartment) => {
      const plan = String(apartment.subscriptionPlan || "UNASSIGNED").toUpperCase();
      counts[plan] = (counts[plan] || 0) + 1;
      return counts;
    }, {});
    const subscriptionDistribution = Object.entries(subscriptionCounts)
      .map(([plan, count]) => ({
        plan,
        count,
        percentage: reportApartments.length ? Math.round((count / reportApartments.length) * 100) : 0,
      }))
      .sort((left, right) => right.count - left.count);

    const complaintStatusChart = complaintStatusGroups
      .map((group) => ({
        status: group.status,
        count: group._count._all,
      }))
      .sort((left, right) => right.count - left.count);

    res.json({
      data: {
        totalApartments,
        totalLocations,
        totalSubscriptions,
        totalComplaints,
        totalFinance: financeTotal._sum.amount || 0,
        charts: {
          cityWiseApartments,
          monthlyGrowth,
          subscriptionDistribution,
          complaintStatus: complaintStatusChart,
        },
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (_req, res, next) => {
  try {
    const promoterId = _req.user.id;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const apartmentScope = { location: { promoterId } };
    const scopedApartmentRelation = { apartment: apartmentScope };

    const [
      totalLocations,
      locationsThisMonth,
      locationsLastMonth,
      apartments,
      totalComplaints,
      resolvedComplaints,
      totalBills,
      paidBills,
      financeApartments,
      complaintApartments,
      announcementApartments,
      amenityApartments,
      recentLocations,
      recentApartments,
      recentComplaints,
      recentFinanceEntries,
    ] = await Promise.all([
      prisma.location.count({ where: { promoterId } }),
      prisma.location.count({ where: { promoterId, createdAt: { gte: thisMonthStart } } }),
      prisma.location.count({
        where: {
          promoterId,
          createdAt: {
            gte: lastMonthStart,
            lt: thisMonthStart,
          },
        },
      }),
      prisma.apartment.findMany({
        where: apartmentScope,
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.complaint.count({ where: scopedApartmentRelation }),
      prisma.complaint.count({
        where: {
          ...scopedApartmentRelation,
          status: {
            in: ["RESOLVED", "COMPLETED", "CLOSED"],
          },
        },
      }),
      prisma.maintenanceBill.count({ where: scopedApartmentRelation }),
      prisma.maintenanceBill.count({
        where: {
          ...scopedApartmentRelation,
          status: "PAID",
        },
      }),
      prisma.financeEntry.findMany({
        where: scopedApartmentRelation,
        distinct: ["apartmentId"],
        select: { apartmentId: true },
      }),
      prisma.complaint.findMany({
        where: scopedApartmentRelation,
        distinct: ["apartmentId"],
        select: { apartmentId: true },
      }),
      prisma.announcement.findMany({
        where: scopedApartmentRelation,
        distinct: ["apartmentId"],
        select: { apartmentId: true },
      }),
      prisma.amenity.findMany({
        where: scopedApartmentRelation,
        distinct: ["apartmentId"],
        select: { apartmentId: true },
      }),
      prisma.location.findMany({
        where: { promoterId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          city: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.apartment.findMany({
        where: apartmentScope,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          subscriptionPlan: true,
          createdAt: true,
          location: { select: { name: true } },
        },
      }),
      prisma.complaint.findMany({
        where: scopedApartmentRelation,
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          apartment: { select: { name: true } },
        },
      }),
      prisma.financeEntry.findMany({
        where: scopedApartmentRelation,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          category: true,
          amount: true,
          createdAt: true,
          apartment: { select: { name: true } },
        },
      }),
    ]);

    const locationGrowthPercent = lastMonthStart
      ? lastMonthStart && locationsLastMonth > 0
        ? Math.round(((locationsThisMonth - locationsLastMonth) / locationsLastMonth) * 100)
        : locationsThisMonth > 0
          ? 100
          : 0
      : 0;
    const complaintSlaPercent = totalComplaints
      ? Math.round((resolvedComplaints / totalComplaints) * 100)
      : 0;
    const paymentSuccessPercent = totalBills ? Math.round((paidBills / totalBills) * 100) : 0;
    const usedApartmentIds = new Set([
      ...financeApartments.map((item) => item.apartmentId),
      ...complaintApartments.map((item) => item.apartmentId),
      ...announcementApartments.map((item) => item.apartmentId),
      ...amenityApartments.map((item) => item.apartmentId),
    ]);
    const usageIntensityPercent = apartments.length
      ? Math.round((usedApartmentIds.size / apartments.length) * 100)
      : 0;

    const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
    const monthlyCounts = apartments.reduce((counts, apartment) => {
      const date = new Date(apartment.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      counts[key] = {
        month: monthFormatter.format(date),
        sortKey: key,
        count: (counts[key]?.count || 0) + 1,
      };
      return counts;
    }, {});
    const performanceTrend = Object.values(monthlyCounts)
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
      .slice(-6)
      .map(({ month, count }) => ({ month, count }));

    res.json({
      data: {
        totalLocations,
        totalApartments: apartments.length,
        locationGrowthPercent,
        usageIntensityPercent,
        complaintSlaPercent,
        paymentSuccessPercent,
        performanceTrend,
        insights: {
          locationInsight: `${totalLocations} location records are linked to this promoter.`,
          engagementInsight: `${usedApartmentIds.size} apartments have activity in finance, complaints, announcements, or amenities.`,
          growthInsight: `${apartments.length} apartments are available for trend analysis.`,
        },
        originalData: {
          recentLocations,
          recentApartments,
          recentComplaints,
          recentFinanceEntries,
        },
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (_req, res, next) => {
  try {
    const promoterId = _req.user.id;
    const apartmentScope = { location: { promoterId } };
    const scopedApartmentRelation = { apartment: apartmentScope };

    const [locations, apartments, complaints, financeEntries, adminUsers] = await Promise.all([
      prisma.location.findMany({
        where: { promoterId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          name: true,
          createdAt: true,
          adminName: true,
        },
      }),
      prisma.apartment.findMany({
        where: apartmentScope,
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          name: true,
          createdAt: true,
          adminName: true,
          location: { select: { name: true } },
        },
      }),
      prisma.complaint.findMany({
        where: scopedApartmentRelation,
        orderBy: { updatedAt: "desc" },
        take: 25,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          apartment: { select: { name: true } },
        },
      }),
      prisma.financeEntry.findMany({
        where: scopedApartmentRelation,
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          amount: true,
          type: true,
          category: true,
          createdAt: true,
          apartment: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            {
              ...roleWhere("LOCATION_ADMIN"),
              location: { promoterId },
            },
            {
              ...roleWhere("APARTMENT_ADMIN"),
              apartment: apartmentScope,
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          name: true,
          createdAt: true,
          role: { select: { name: true } },
        },
      }),
    ]);

    const logs = [
      ...locations.map((location) => ({
        id: `location-${location.id}`,
        createdAt: location.createdAt,
        user: location.adminName || "Super Admin",
        role: "PROMOTER",
        action: `Created location: ${location.name}`,
        module: "Locations",
        status: "Success",
        sensitive: false,
      })),
      ...apartments.map((apartment) => ({
        id: `apartment-${apartment.id}`,
        createdAt: apartment.createdAt,
        user: apartment.adminName || "Super Admin",
        role: "PROMOTER",
        action: `Created apartment: ${apartment.name}`,
        module: apartment.location?.name || "Apartments",
        status: "Success",
        sensitive: false,
      })),
      ...complaints.map((complaint) => ({
        id: `complaint-${complaint.id}`,
        createdAt: complaint.updatedAt,
        user: complaint.apartment?.name || "Apartment",
        role: "APARTMENT",
        action: `Complaint ${complaint.status}: ${complaint.title}`,
        module: "Complaints",
        status: complaint.status,
        sensitive: ["OPEN", "ASSIGNED", "WORKED"].includes(String(complaint.status)),
      })),
      ...financeEntries.map((entry) => ({
        id: `finance-${entry.id}`,
        createdAt: entry.createdAt,
        user: entry.apartment?.name || "Apartment",
        role: "APARTMENT",
        action: `${entry.type || "Finance"} entry ${entry.category || ""} ₹${Number(entry.amount || 0)}`,
        module: "Finance",
        status: "Recorded",
        sensitive: true,
      })),
      ...adminUsers.map((user) => ({
        id: `admin-${user.id}`,
        createdAt: user.createdAt,
        user: user.name,
        role: user.role?.name || "ADMIN",
        action: `Created admin account: ${user.name}`,
        module: "Users",
        status: "Success",
        sensitive: true,
      })),
    ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

    const modules = new Set(logs.map((log) => log.module));
    const flaggedActions = logs.filter((log) => log.sensitive && log.status !== "Success").length;
    const sensitiveChanges = logs.filter((log) => log.sensitive).length;

    res.json({
      data: {
        logs: logs.slice(0, 50),
        summary: {
          auditEvents: logs.length,
          sensitiveChanges,
          flaggedActions,
          coveragePercent: logs.length ? Math.min(100, modules.size * 20) : 0,
        },
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};
