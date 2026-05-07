const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.raiseComplaint = async (req, res, next) => {
  try {
    const { title, description, apartmentId, flatId, residentId } = req.body;
    const complaint = await prisma.complaint.create({
      data: { title, description, apartmentId, flatId: flatId || null, residentId },
    });
    res.status(201).json({ data: complaint, message: "complaint raised" });
  } catch (error) {
    next(error);
  }
};

exports.assignComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { assignedStaffId } = req.body;

    if (!complaintId || !assignedStaffId) {
      return res.status(400).json({ message: "complaintId and assignedStaffId are required" });
    }

    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: { assignedStaffId, status: "ASSIGNED" },
    });
    res.json({ data: complaint, message: "complaint assigned" });
  } catch (error) {
    next(error);
  }
};

exports.resolveComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: "RESOLVED" },
    });
    res.json({ data: complaint, message: "complaint resolved" });
  } catch (error) {
    next(error);
  }
};

exports.closeComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    if (!complaintId) {
      return res.status(400).json({ message: "complaintId is required" });
    }

    const result = await prisma.complaint.updateMany({
      where: { id: complaintId, status: "COMPLETED" },
      data: { status: "CLOSED" },
    });

    if (!result.count) {
      return res.status(400).json({ message: "Only resident-completed complaints can be closed by admin" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    res.json({ data: complaint, message: "complaint closed" });
  } catch (error) {
    next(error);
  }
};
