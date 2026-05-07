const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const notifications = [];

function normalizeAnnouncementAudience(value) {
  const normalized = String(value || "ALL").trim().toUpperCase();
  return ["ALL", "RESIDENT", "STAFF"].includes(normalized) ? normalized : "ALL";
}

function normalizeAnnouncementPriority(value) {
  const normalized = String(value || "NORMAL").trim().toUpperCase();
  return ["NORMAL", "HIGH", "URGENT", "CRITICAL"].includes(normalized) ? normalized : "NORMAL";
}

exports.sendAnnouncement = async (req, res, next) => {
  try {
    const {
      apartmentId,
      title,
      message,
      category,
      priority,
      audience,
      status,
      mediaType,
      mediaName,
      mediaData,
      publishAt,
    } = req.body;

    if (!apartmentId || !title || !message) {
      return res.status(400).json({ message: "apartmentId, title, and message are required" });
    }

    const announcement = await prisma.announcement.create({
      data: {
        apartmentId,
        title,
        message,
        category: category || null,
        priority: normalizeAnnouncementPriority(priority),
        audience: normalizeAnnouncementAudience(audience),
        status: status || "PUBLISHED",
        mediaType: mediaType || null,
        mediaName: mediaName || null,
        mediaData: mediaData || null,
        publishAt: publishAt ? new Date(publishAt) : null,
      },
    });

    res.status(201).json({ data: announcement, message: "announcement sent" });
  } catch (error) {
    next(error);
  }
};

exports.getAnnouncements = async (req, res, next) => {
  try {
    const { apartmentId, audience, userId } = req.query;
    let resolvedApartmentId = apartmentId;

    if (!resolvedApartmentId && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { apartmentId: true },
      });
      resolvedApartmentId = user?.apartmentId;
    }

    if (!resolvedApartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const normalizedAudience = audience ? normalizeAnnouncementAudience(audience) : null;
    const audienceWhere = normalizedAudience === "RESIDENT"
      ? {
          status: "PUBLISHED",
          OR: [
            { publishAt: null },
            { publishAt: { lte: new Date() } },
          ],
          NOT: {
            audience: {
              in: ["STAFF", "staff", "Staff"],
            },
          },
        }
      : normalizedAudience
        ? {
            OR: [
              { audience: null },
              { audience: "" },
              { audience: "ALL" },
              { audience: "all" },
              { audience: "All" },
              { audience: normalizedAudience },
              { audience: normalizedAudience.toLowerCase() },
              { audience: normalizedAudience.charAt(0) + normalizedAudience.slice(1).toLowerCase() },
            ],
          }
        : {};

    const announcements = await prisma.announcement.findMany({
      where: {
        apartmentId: resolvedApartmentId,
        ...audienceWhere,
      },
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
    });

    res.json({ data: announcements, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.sendEventNotification = async (req, res) => {
  const payload = {
    id: `${Date.now()}`,
    type: req.body.type || "EVENT",
    status: req.body.status || "SENT",
    priority: req.body.priority || "NORMAL",
    audience: req.body.audience || "ALL",
    source: req.body.source || "STAFF",
    ...req.body,
    createdAt: new Date(),
  };
  notifications.push(payload);
  res.status(201).json({ data: payload, message: "event notification sent" });
};

exports.getUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        apartmentId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User was not found" });
    }

    const apartmentAnnouncements = await prisma.announcement.findMany({
      where: {
        apartmentId: user.apartmentId,
        status: {
          in: ["PUBLISHED", "SENT"],
        },
        OR: [
          { audience: null },
          { audience: "" },
          { audience: "ALL" },
          { audience: "all" },
          { audience: "All" },
          { audience: "RESIDENT" },
          { audience: "resident" },
          { audience: "Resident" },
        ],
      },
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
    });

    const directNotifications = notifications.filter((item) => {
      const matchesUser = !item.userId || `${item.userId}` === `${userId}`;
      const matchesApartment = !item.apartmentId || `${item.apartmentId}` === `${user.apartmentId}`;
      const audience = String(item.audience || "ALL").toUpperCase();
      const visibleToResident = ["ALL", "RESIDENT"].includes(audience);
      return matchesUser && matchesApartment && visibleToResident;
    });

    const result = [
      ...apartmentAnnouncements.map((item) => ({
        ...item,
        source: item.source || "ADMIN",
        publishedAt: item.publishAt || item.createdAt,
      })),
      ...directNotifications,
    ].sort((left, right) => {
      const leftDate = new Date(left.publishedAt || left.publishAt || left.createdAt || 0).getTime();
      const rightDate = new Date(right.publishedAt || right.publishAt || right.createdAt || 0).getTime();
      return rightDate - leftDate;
    });

    res.json({ data: result, message: "success" });
  } catch (error) {
    next(error);
  }
};
