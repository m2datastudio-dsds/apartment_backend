const bcrypt = require("bcryptjs");
const os = require("os");
const prisma = require("../lib/prisma");
const { getRoleId, getUserRoleName, roleInclude, roleWhere } = require("../utils/roles");
const { generateUserId } = require("../utils/userId");
const { getMetrics } = require("../utils/systemMetrics");

exports.getDashboard = async (_req, res, next) => {
  try {
    const [
      totalUsers,
      totalSuperAdmins,
      totalResidents,
      totalStaff,
      totalLocations,
      totalApartments,
      activeApartments,
      totalComplaints,
      openComplaints,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: roleWhere("PROMOTER") }),
      prisma.user.count({ where: roleWhere("RESIDENT") }),
      prisma.user.count({ where: roleWhere("STAFF") }),
      prisma.location.count(),
      prisma.apartment.count(),
      prisma.apartment.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.complaint.count(),
      prisma.complaint.count({
        where: {
          status: {
            in: ["OPEN", "ASSIGNED", "WORKED"],
          },
        },
      }),
    ]);

    res.json({
      data: {
        totalUsers,
        totalSuperAdmins,
        totalResidents,
        totalStaff,
        totalLocations,
        totalApartments,
        activeApartments,
        totalComplaints,
        openComplaints,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getGlobalReports = async (_req, res, next) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalLocations,
      totalApartments,
      activeApartments,
      totalComplaints,
      resolvedComplaints,
      newResidentsThisMonth,
      newResidentsLastMonth,
      complaintsThisMonth,
      complaintsLastMonth,
      amenityBookingsThisMonth,
      amenityBookingsLastMonth,
      totalFinanceAmount,
      financeAmountThisMonth,
      financeAmountLastMonth,
    ] = await Promise.all([
      prisma.location.count(),
      prisma.apartment.count(),
      prisma.apartment.count({ where: { status: "ACTIVE" } }),
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: { in: ["RESOLVED", "COMPLETED", "CLOSED"] } } }),
      prisma.user.count({ where: { ...roleWhere("RESIDENT"), createdAt: { gte: thisMonthStart } } }),
      prisma.user.count({
        where: {
          ...roleWhere("RESIDENT"),
          createdAt: {
            gte: lastMonthStart,
            lt: thisMonthStart,
          },
        },
      }),
      prisma.complaint.count({ where: { createdAt: { gte: thisMonthStart } } }),
      prisma.complaint.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
      prisma.amenityBooking.count({ where: { createdAt: { gte: thisMonthStart } } }),
      prisma.amenityBooking.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
      prisma.financeEntry.aggregate({ _sum: { amount: true } }),
      prisma.financeEntry.aggregate({ where: { createdAt: { gte: thisMonthStart } }, _sum: { amount: true } }),
      prisma.financeEntry.aggregate({
        where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      data: {
        totalLocations,
        totalApartments,
        activeApartments,
        totalComplaints,
        resolvedComplaints,
        newResidentsThisMonth,
        newResidentsLastMonth,
        complaintsThisMonth,
        complaintsLastMonth,
        amenityBookingsThisMonth,
        amenityBookingsLastMonth,
        totalRevenue: totalFinanceAmount._sum.amount || 0,
        revenueThisMonth: financeAmountThisMonth._sum.amount || 0,
        revenueLastMonth: financeAmountLastMonth._sum.amount || 0,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getSystemHealth = async (_req, res, next) => {
  try {
    const metrics = getMetrics();
    const uptimeSeconds = Math.floor(process.uptime());
    const cpuUsage = process.cpuUsage();
    const cpuTotalMicros = cpuUsage.user + cpuUsage.system;
    const cpuUsagePercent = Math.min(
      100,
      Math.round((cpuTotalMicros / (uptimeSeconds * 1000000 * os.cpus().length || 1)) * 100)
    );
    const memory = process.memoryUsage();
    const memoryUsagePercent = Math.round((memory.rss / os.totalmem()) * 100);

    const dbStarted = Date.now();
    let dataStatus = "ONLINE";
    let dbLatencyMs = 0;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStarted;
    } catch (_error) {
      dataStatus = "OFFLINE";
      dbLatencyMs = Date.now() - dbStarted;
    }

    res.json({
      data: {
        apiStatus: "ONLINE",
        dataStatus,
        serviceUptimeSeconds: uptimeSeconds,
        errorCount: metrics.errorCount,
        cpuUsagePercent,
        memoryUsagePercent,
        activeSessions: metrics.activeRequests,
        averageResponseTimeMs: metrics.averageResponseTimeMs,
        totalRequests: metrics.totalRequests,
        dbLatencyMs,
        memoryUsedMb: Math.round(memory.rss / 1024 / 1024),
        memoryTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getActivityLogs = async (_req, res, next) => {
  try {
    const [superAdmins, locations, apartments] = await Promise.all([
      prisma.user.findMany({
        where: roleWhere("PROMOTER"),
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      }),
      prisma.location.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          createdAt: true,
          promoter: {
            select: {
              name: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.apartment.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          createdAt: true,
          location: {
            select: {
              promoter: {
                select: {
                  name: true,
                  role: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const logs = [
      ...superAdmins.map((user) => ({
        id: `super-admin-${user.id}`,
        createdAt: user.createdAt,
        user: "System Admin",
        role: "SYSTEM_ADMIN",
        action: `Created Super Admin: ${user.name}`,
        module: "User Mgmt",
        status: "Success",
      })),
      ...locations.map((location) => ({
        id: `location-${location.id}`,
        createdAt: location.createdAt,
        user: location.promoter?.name || "Super Admin",
        role: location.promoter?.role?.name || "PROMOTER",
        action: `Created Location: ${location.name}`,
        module: "Locations",
        status: "Success",
      })),
      ...apartments.map((apartment) => ({
        id: `apartment-${apartment.id}`,
        createdAt: apartment.createdAt,
        user: apartment.location?.promoter?.name || "Super Admin",
        role: apartment.location?.promoter?.role?.name || "PROMOTER",
        action: `Created Apartment: ${apartment.name}`,
        module: "Apartments",
        status: "Success",
      })),
    ]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, 100);

    res.json({ data: logs, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createSuperAdmin = async (req, res, next) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      password,
      organizationName,
      assignedRegion,
    } = req.body;

    if (!name || !mobileNumber || !password) {
      return res.status(400).json({
        message: "name, mobileNumber, and password are required",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ mobileNumber }, ...(email ? [{ email }] : [])],
      },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User with this mobile number or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await generateUserId();
    const roleId = await getRoleId("PROMOTER");
    const user = await prisma.user.create({
      data: {
        userId,
        name,
        organizationName: organizationName || null,
        accessLevel: "Promoter admin",
        assignedRegion: assignedRegion || null,
        accountStatus: "ACTIVE",
        onboardingFlow: "PENDING",
        mobileNumber,
        email,
        password: hashedPassword,
        roleId,
      },
      include: roleInclude,
    });
    res.status(201).json({
      data: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        organizationName: user.organizationName,
        accessLevel: user.accessLevel,
        assignedRegion: user.assignedRegion,
        accountStatus: user.accountStatus,
        onboardingFlow: user.onboardingFlow,
        mobileNumber: user.mobileNumber,
        email: user.email,
        role: getUserRoleName(user),
        createdAt: user.createdAt,
      },
      message: "super admin created",
    });
  } catch (error) {
    next(error);
  }
};

exports.getSuperAdmins = async (_req, res, next) => {
  try {
    const [superAdmins, totalLocations, totalApartments] = await Promise.all([
      prisma.user.findMany({
        where: roleWhere("PROMOTER"),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          mobileNumber: true,
          organizationName: true,
          assignedRegion: true,
          accountStatus: true,
          onboardingFlow: true,
          roleId: true,
          role: {
            select: {
              name: true,
            },
          },
          promotedLocations: {
            select: {
              id: true,
              name: true,
              status: true,
              _count: {
                select: {
                  apartments: true,
                },
              },
            },
          },
        },
      }),
      prisma.location.count(),
      prisma.apartment.count(),
    ]);

    const inactiveSuperAdmins = superAdmins.filter(
      (user) => String(user.accountStatus || "").toUpperCase() !== "ACTIVE"
    ).length;

    res.json({
      data: superAdmins.map((user) => ({
        ...user,
        role: getUserRoleName(user),
        locationCount: user.promotedLocations.length,
        apartmentCount: user.promotedLocations.reduce(
          (total, location) => total + location._count.apartments,
          0
        ),
        location: user.promotedLocations[0]
          ? { name: user.promotedLocations[0].name }
          : null,
        apartment: null,
        promotedLocations: undefined,
      })),
      summary: {
        totalSuperAdmins: superAdmins.length,
        totalLocations,
        totalApartments,
        inactiveSuperAdmins,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};
