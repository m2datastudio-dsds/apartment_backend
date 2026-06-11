const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const VISITOR_STATUSES = new Set([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "BLOCKED",
]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeStatus(value, fallback = "PENDING") {
  const normalized = String(value || fallback).trim().toUpperCase();
  if (["ENTERED", "IN"].includes(normalized)) return "CHECKED_IN";
  if (["EXITED", "OUT", "COMPLETED"].includes(normalized)) return "CHECKED_OUT";
  return VISITOR_STATUSES.has(normalized) ? normalized : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildWhere(query) {
  const where = {};
  if (query.apartmentId) where.apartmentId = query.apartmentId;
  if (query.residentId) where.residentId = query.residentId;
  if (query.staffId) where.staffId = query.staffId;
  if (query.status) where.status = normalizeStatus(query.status);
  if (String(query.active || "").toLowerCase() === "true") where.status = "CHECKED_IN";
  if (String(query.preApproved || "").toLowerCase() === "true") {
    where.status = "APPROVED";
    where.staffId = null;
  }
  return where;
}

async function generatePassCode() {
  for (let index = 0; index < 12; index += 1) {
    const passCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await prisma.visitorRecord.findUnique({
      where: { passCode },
      select: { id: true },
    });
    if (!existing) return passCode;
  }

  throw new Error("Unable to generate unique visitor pass code");
}

async function resolveResident(residentId) {
  if (!residentId) return null;
  return prisma.user.findUnique({
    where: { id: residentId },
    include: { flat: { include: { block: true } } },
  });
}

async function resolveFlat(flatId, apartmentId) {
  if (!flatId) return null;
  return prisma.flat.findFirst({
    where: { id: flatId, apartmentId },
    include: { block: true },
  });
}

function includeVisitorDetails() {
  return {
    resident: {
      select: {
        id: true,
        userId: true,
        name: true,
        mobileNumber: true,
      },
    },
    flat: {
      select: {
        id: true,
        number: true,
        block: { select: { name: true } },
      },
    },
    staff: {
      select: {
        id: true,
        userId: true,
        name: true,
        mobileNumber: true,
      },
    },
  };
}

async function createVisitorRecord(req, res, next, options = {}) {
  try {
    const {
      apartmentId,
      residentId,
      flatId,
      staffId,
      staffName,
      visitorType,
      visitorName,
      name,
      mobileNumber,
      phone,
      purpose,
      vehicleNumber,
      visitDate,
      checkInAt,
      checkOutAt,
      proofType,
      proofName,
      proofData,
      documentType,
      documentNumber,
      notes,
    } = req.body;

    const resolvedVisitorName = cleanText(visitorName || name);
    if (!apartmentId || !resolvedVisitorName) {
      return res.status(400).json({ message: "apartmentId and visitorName are required" });
    }

    const [resident, requestedFlat, staff] = await Promise.all([
      resolveResident(residentId),
      resolveFlat(flatId, apartmentId),
      staffId ? prisma.user.findUnique({ where: { id: staffId }, select: { id: true, name: true } }) : null,
    ]);

    if (residentId && (!resident || resident.apartmentId !== apartmentId)) {
      return res.status(404).json({ message: "Selected resident was not found for this apartment" });
    }

    if (flatId && !requestedFlat) {
      return res.status(404).json({ message: "Selected flat was not found for this apartment" });
    }

    if (staffId && !staff) {
      return res.status(404).json({ message: "Selected staff was not found" });
    }

    const resolvedFlat = requestedFlat || resident?.flat || null;
    const isResidentPreApproval = options.preApproved || (!staffId && residentId);
    const initialStatus = options.status || "PENDING";
    const entryDate = parseDate(checkInAt);
    const exitDate = parseDate(checkOutAt);
    const status = entryDate ? "CHECKED_IN" : normalizeStatus(initialStatus, "PENDING");
    const shouldGeneratePassCode = Boolean(options.generatePassCode || staffId || entryDate);

    const record = await prisma.visitorRecord.create({
      data: {
        apartmentId,
        residentId: residentId || null,
        flatId: resolvedFlat?.id || flatId || null,
        staffId: staffId || null,
        staffName: cleanText(staffName) || staff?.name || null,
        visitorType: cleanText(visitorType) || "VISITOR",
        visitorName: resolvedVisitorName,
        mobileNumber: cleanText(mobileNumber || phone) || null,
        purpose: cleanText(purpose) || null,
        vehicleNumber: cleanText(vehicleNumber) || null,
        visitDate: parseDate(visitDate) || new Date(),
        passCode: shouldGeneratePassCode ? await generatePassCode() : null,
        status,
        approved: ["APPROVED", "CHECKED_IN", "CHECKED_OUT"].includes(status),
        residentName: resident?.name || null,
        residentMobile: resident?.mobileNumber || null,
        flatNumber: resolvedFlat?.number || null,
        blockName: resolvedFlat?.block?.name || null,
        proofType: cleanText(proofType) || null,
        proofName: cleanText(proofName) || null,
        proofData: proofData || null,
        documentType: cleanText(documentType) || null,
        documentNumber: cleanText(documentNumber) || null,
        notes: cleanText(notes) || null,
        decisionAt: ["APPROVED", "REJECTED"].includes(status) ? new Date() : null,
        entryAcceptedAt: entryDate,
        exitAcceptedAt: exitDate,
      },
      include: includeVisitorDetails(),
    });

    return res.status(201).json({
      data: record,
      message: isResidentPreApproval
        ? "visitor pass request sent to admin/secretary"
        : "visitor approval sent to resident",
    });
  } catch (error) {
    next(error);
  }
}

exports.createVisitorPass = (req, res, next) => createVisitorRecord(req, res, next);

exports.createVisitor = (req, res, next) => createVisitorRecord(req, res, next, {
  status: req.body.status,
  generatePassCode: true,
});

exports.generateVisitorPassCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await prisma.visitorRecord.findUnique({ where: { id } });

    if (!record) {
      return res.status(404).json({ message: "visitor pass request not found" });
    }

    if (record.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending visitor pass requests can generate a code" });
    }

    const updated = await prisma.visitorRecord.update({
      where: { id },
      data: {
        passCode: record.passCode || await generatePassCode(),
        status: "APPROVED",
        approved: true,
        decisionAt: new Date(),
      },
      include: includeVisitorDetails(),
    });

    return res.json({
      data: updated,
      message: `visitor pass generated: ${updated.passCode}`,
    });
  } catch (error) {
    next(error);
  }
};

exports.approveVisitorOtp = async (req, res, next) => {
  try {
    const { id, otp, passCode } = req.body;
    const record = await prisma.visitorRecord.findFirst({
      where: { id, passCode: otp || passCode },
    });

    if (!record) return res.status(400).json({ message: "invalid visitor pass code" });

    const updated = await prisma.visitorRecord.update({
      where: { id: record.id },
      data: {
        status: "APPROVED",
        approved: true,
        decisionAt: new Date(),
      },
      include: includeVisitorDetails(),
    });

    return res.json({ data: updated, message: "visitor approved" });
  } catch (error) {
    next(error);
  }
};

exports.decideVisitorEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { residentId, decision, decisionNotes } = req.body;
    const record = await prisma.visitorRecord.findUnique({ where: { id } });

    if (!record) {
      return res.status(404).json({ message: "visitor entry not found" });
    }

    if (residentId && record.residentId !== residentId) {
      return res.status(403).json({ message: "visitor entry does not belong to this resident" });
    }

    const normalizedDecision = normalizeStatus(decision);
    if (!["APPROVED", "REJECTED"].includes(normalizedDecision)) {
      return res.status(400).json({ message: "decision must be APPROVED or REJECTED" });
    }

    const updated = await prisma.visitorRecord.update({
      where: { id },
      data: {
        status: normalizedDecision,
        approved: normalizedDecision === "APPROVED",
        decisionNotes: cleanText(decisionNotes) || null,
        decisionAt: new Date(),
      },
      include: includeVisitorDetails(),
    });

    return res.json({
      data: updated,
      message: normalizedDecision === "APPROVED" ? "visitor approved" : "visitor rejected",
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptVisitorEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId, passCode, flatNumber } = req.body;
    const record = await prisma.visitorRecord.findUnique({ where: { id } });

    if (!record) {
      return res.status(404).json({ message: "visitor entry not found" });
    }

    if (staffId && record.staffId && record.staffId !== staffId) {
      return res.status(403).json({ message: "visitor entry does not belong to this staff" });
    }

    if (passCode && record.passCode !== passCode) {
      return res.status(400).json({ message: "Visitor pass code is invalid" });
    }

    if (flatNumber && record.flatNumber && String(record.flatNumber).toUpperCase() !== String(flatNumber).toUpperCase()) {
      return res.status(400).json({ message: "Visitor flat number is invalid" });
    }

    if (record.status !== "APPROVED") {
      return res.status(400).json({ message: "Only approved visitors can be checked in" });
    }

    const today = new Date();
    if (record.visitDate && record.visitDate.toDateString() !== today.toDateString()) {
      return res.status(400).json({ message: "Visitor pass is not valid for today" });
    }

    const updated = await prisma.visitorRecord.update({
      where: { id },
      data: {
        status: "CHECKED_IN",
        approved: true,
        staffId: staffId || record.staffId,
        entryAcceptedAt: new Date(),
      },
      include: includeVisitorDetails(),
    });

    return res.json({ data: updated, message: "visitor checked in" });
  } catch (error) {
    next(error);
  }
};

exports.acceptVisitorExit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;
    const record = await prisma.visitorRecord.findUnique({ where: { id } });

    if (!record) {
      return res.status(404).json({ message: "visitor entry not found" });
    }

    if (staffId && record.staffId && record.staffId !== staffId) {
      return res.status(403).json({ message: "visitor entry does not belong to this staff" });
    }

    if (record.status !== "CHECKED_IN") {
      return res.status(400).json({ message: "Only checked-in visitors can be checked out" });
    }

    const updated = await prisma.visitorRecord.update({
      where: { id },
      data: {
        status: "CHECKED_OUT",
        staffId: staffId || record.staffId,
        exitAcceptedAt: new Date(),
      },
      include: includeVisitorDetails(),
    });

    return res.json({ data: updated, message: "visitor checked out" });
  } catch (error) {
    next(error);
  }
};

exports.blockVisitor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const record = await prisma.visitorRecord.findUnique({ where: { id } });

    if (!record) {
      return res.status(404).json({ message: "visitor entry not found" });
    }

    const updated = await prisma.visitorRecord.update({
      where: { id },
      data: {
        status: "BLOCKED",
        blocked: true,
        approved: false,
        decisionNotes: cleanText(notes) || record.decisionNotes,
        decisionAt: new Date(),
      },
      include: includeVisitorDetails(),
    });

    return res.json({ data: updated, message: "visitor blocked" });
  } catch (error) {
    next(error);
  }
};

exports.getVisitorLogs = async (req, res, next) => {
  try {
    const result = await prisma.visitorRecord.findMany({
      where: buildWhere(req.query),
      orderBy: { createdAt: "desc" },
      include: includeVisitorDetails(),
    });

    res.json({ data: result, message: "success" });
  } catch (error) {
    next(error);
  }
};
