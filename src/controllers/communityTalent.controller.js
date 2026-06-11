const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

function getRequestUser(req) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET || "apartment-secret-key");
  } catch (_error) {
    return null;
  }
}

async function getAuthenticatedUser(req) {
  const payload = getRequestUser(req);

  if (!payload?.sub) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: true, flat: { include: { block: true } }, apartment: true },
  });
}

exports.createProfile = async (req, res) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    const residentId = req.body.residentId || (authUser?.role?.name === "RESIDENT" ? authUser.id : null);
    const resident = residentId
      ? await prisma.user.findUnique({
          where: { id: residentId },
          include: { flat: { include: { block: true } }, apartment: true },
        })
      : null;

    const apartmentId = req.body.apartmentId || resident?.apartmentId || authUser?.apartmentId;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const profile = await prisma.communityTalentProfile.create({
      data: {
        apartmentId,
        apartmentName: resident?.apartment?.name || req.body.apartmentName || null,
        residentId: resident?.id || residentId || null,
        residentName: resident?.name || req.body.residentName || "Resident",
        flatId: req.body.flatId || resident?.flatId || null,
        flatNumber: resident?.flat?.number || req.body.flatNumber || null,
        blockName: resident?.flat?.block?.name || req.body.blockName || null,
        profileTitle: req.body.profileTitle || req.body.title || "Community Profile",
        mainSkill: req.body.mainSkill || req.body.skill || null,
        interestArea: req.body.interestArea || req.body.interest || null,
        description: req.body.description || null,
      },
    });

    return res.status(201).json({ data: profile, message: "community talent profile saved" });
  } catch (error) {
    return res.status(500).json({ message: "unable to save community talent profile" });
  }
};

exports.getProfiles = async (req, res) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    const where = {};

    const includeAllApartments = req.query.scope === "all" || req.query.allApartments === "true";
    const apartmentId = includeAllApartments ? null : req.query.apartmentId || authUser?.apartmentId;

    if (apartmentId) {
      where.apartmentId = apartmentId;
    }

    if (req.query.residentId) {
      where.residentId = req.query.residentId;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const result = await prisma.communityTalentProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        resident: {
          select: {
            name: true,
            mobileNumber: true,
            email: true,
          },
        },
      },
    });

    return res.json({ data: result, message: "success" });
  } catch (error) {
    return res.status(500).json({ message: "unable to load community talent profiles" });
  }
};

exports.approveFeature = async (req, res) => {
  const { id } = req.params;

  try {
    const profile = await prisma.communityTalentProfile.update({
      where: { id },
      data: {
        featured: true,
        status: "FEATURED",
        featuredAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    return res.json({ data: profile, message: "profile approved for feature" });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "community talent profile not found" });
    }

    return res.status(500).json({ message: "unable to approve community talent profile" });
  }
};

exports.sendFeedback = async (req, res) => {
  const { id } = req.params;

  try {
    const profile = await prisma.communityTalentProfile.update({
      where: { id },
      data: {
        status: "FEEDBACK_SHARED",
        feedbackNotes: req.body.feedbackNotes || "Feedback shared by apartment admin.",
        reviewedAt: new Date(),
      },
    });

    return res.json({ data: profile, message: "feedback shared with resident profile" });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "community talent profile not found" });
    }

    return res.status(500).json({ message: "unable to send community talent feedback" });
  }
};
