const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const visitors = [];

function normalizeStatus(value) {
  const normalized = String(value || "PENDING").trim().toUpperCase();
  return ["PENDING", "APPROVED", "REJECTED", "ENTERED", "EXITED"].includes(normalized) ? normalized : "PENDING";
}

function matchesQuery(record, query) {
  if (query.apartmentId && record.apartmentId !== query.apartmentId) {
    return false;
  }

  if (query.residentId && record.residentId !== query.residentId) {
    return false;
  }

  if (query.staffId && record.staffId !== query.staffId) {
    return false;
  }

  if (query.status && record.status !== normalizeStatus(query.status)) {
    return false;
  }

  return true;
}

exports.createVisitorPass = async (req, res) => {
  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toISOString();
  const resident = req.body.residentId
    ? await prisma.user.findUnique({
        where: { id: req.body.residentId },
        include: { flat: { include: { block: true } } },
      })
    : null;
  const staff = req.body.staffId
    ? await prisma.user.findUnique({ where: { id: req.body.staffId }, select: { name: true } })
    : null;
  const record = {
    id: `${Date.now()}`,
    visitorType: req.body.visitorType || "VISITOR",
    visitorName: req.body.visitorName || req.body.name || "Visitor",
    mobileNumber: req.body.mobileNumber || req.body.phone || null,
    purpose: req.body.purpose || null,
    apartmentId: req.body.apartmentId || null,
    residentId: req.body.residentId || null,
    residentName: resident?.name || null,
    residentMobile: resident?.mobileNumber || null,
    flatId: req.body.flatId || null,
    flatNumber: resident?.flat?.number || null,
    blockName: resident?.flat?.block?.name || null,
    staffId: req.body.staffId || null,
    staffName: req.body.staffName || staff?.name || null,
    proofType: req.body.proofType || null,
    proofName: req.body.proofName || null,
    proofData: req.body.proofData || null,
    documentType: req.body.documentType || null,
    documentNumber: req.body.documentNumber || null,
    notes: req.body.notes || null,
    otp,
    status: "PENDING",
    approved: false,
    decisionAt: null,
    decisionNotes: null,
    entryAcceptedAt: null,
    exitAcceptedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  visitors.unshift(record);
  res.status(201).json({ data: record, message: "visitor approval sent to resident" });
};

exports.approveVisitorOtp = async (req, res) => {
  const { id, otp } = req.body;
  const record = visitors.find((item) => item.id === id && item.otp === otp);
  if (!record) return res.status(400).json({ message: "invalid otp" });
  record.approved = true;
  record.status = "APPROVED";
  record.decisionAt = new Date().toISOString();
  record.updatedAt = record.decisionAt;
  return res.json({ data: record, message: "visitor approved" });
};

exports.decideVisitorEntry = async (req, res) => {
  const { id } = req.params;
  const { residentId, decision, decisionNotes } = req.body;
  const record = visitors.find((item) => item.id === id);

  if (!record) {
    return res.status(404).json({ message: "visitor entry not found" });
  }

  if (residentId && record.residentId !== residentId) {
    return res.status(403).json({ message: "visitor entry does not belong to this resident" });
  }

  const normalizedDecision = String(decision || "").trim().toUpperCase();
  if (!["APPROVED", "REJECTED"].includes(normalizedDecision)) {
    return res.status(400).json({ message: "decision must be APPROVED or REJECTED" });
  }

  record.status = normalizedDecision;
  record.approved = normalizedDecision === "APPROVED";
  record.decisionNotes = decisionNotes || null;
  record.decisionAt = new Date().toISOString();
  record.updatedAt = record.decisionAt;

  return res.json({
    data: record,
    message: normalizedDecision === "APPROVED" ? "visitor approved" : "visitor rejected",
  });
};

exports.acceptVisitorEntry = async (req, res) => {
  const { id } = req.params;
  const { staffId } = req.body;
  const record = visitors.find((item) => item.id === id);

  if (!record) {
    return res.status(404).json({ message: "visitor entry not found" });
  }

  if (staffId && record.staffId !== staffId) {
    return res.status(403).json({ message: "visitor entry does not belong to this staff" });
  }

  if (record.status !== "APPROVED") {
    return res.status(400).json({ message: "Only resident-approved visitors can be accepted at entry" });
  }

  record.status = "ENTERED";
  record.entryAcceptedAt = new Date().toISOString();
  record.updatedAt = record.entryAcceptedAt;

  return res.json({ data: record, message: "visitor entry accepted" });
};

exports.acceptVisitorExit = async (req, res) => {
  const { id } = req.params;
  const { staffId } = req.body;
  const record = visitors.find((item) => item.id === id);

  if (!record) {
    return res.status(404).json({ message: "visitor entry not found" });
  }

  if (staffId && record.staffId !== staffId) {
    return res.status(403).json({ message: "visitor entry does not belong to this staff" });
  }

  if (record.status !== "ENTERED") {
    return res.status(400).json({ message: "Only entered visitors can be marked as exited" });
  }

  record.status = "EXITED";
  record.exitAcceptedAt = new Date().toISOString();
  record.updatedAt = record.exitAcceptedAt;

  return res.json({ data: record, message: "visitor exit accepted" });
};

exports.getVisitorLogs = async (req, res) => {
  const result = visitors.filter((record) => matchesQuery(record, req.query));
  res.json({ data: result, message: "success" });
};
