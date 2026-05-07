const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.getDashboard = async (req, res, next) => {
  try {
    const { staffId } = req.query;
    const where = staffId ? { assignedStaffId: staffId } : undefined;
    const [assignedCount, workedCount, resolvedCount, pendingCount] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.count({ where: { ...(where || {}), status: "WORKED" } }),
      prisma.complaint.count({ where: { ...(where || {}), status: { in: ["RESOLVED", "COMPLETED", "CLOSED"] } } }),
      prisma.complaint.count({ where: { ...(where || {}), status: { in: ["ASSIGNED", "WORKED"] } } }),
    ]);
    res.json({ data: { assignedCount, workedCount, resolvedCount, pendingCount }, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.getComplaints = async (req, res, next) => {
  try {
    const { staffId } = req.query;

    if (!staffId) {
      return res.status(400).json({ message: "staffId is required" });
    }

    const complaints = await prisma.complaint.findMany({
      where: { assignedStaffId: staffId },
      orderBy: { updatedAt: "desc" },
      include: {
        apartment: {
          select: { name: true },
        },
        resident: {
          select: {
            userId: true,
            name: true,
            mobileNumber: true,
          },
        },
        flat: {
          select: {
            number: true,
            block: {
              select: { name: true },
            },
          },
        },
      },
    });

    res.json({ data: complaints, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.submitWorkProof = async (req, res, next) => {
  try {
    const { complaintId, staffId, staffProofType, staffProofName, staffProofData, staffProofNotes } = req.body;

    if (!complaintId || !staffId) {
      return res.status(400).json({ message: "complaintId and staffId are required" });
    }

    const result = await prisma.complaint.updateMany({
      where: { id: complaintId, assignedStaffId: staffId },
      data: {
        status: "RESOLVED",
        staffProofType: staffProofType || null,
        staffProofName: staffProofName || null,
        staffProofData: staffProofData || null,
        staffProofNotes: staffProofNotes || null,
      },
    });

    if (!result.count) {
      return res.status(404).json({ message: "Assigned complaint was not found for this staff" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    res.json({ data: complaint, message: "work proof submitted" });
  } catch (error) {
    next(error);
  }
};

exports.startJob = async (req, res, next) => {
  try {
    const { complaintId, staffId } = req.body;

    if (!complaintId || !staffId) {
      return res.status(400).json({ message: "complaintId and staffId are required" });
    }

    const result = await prisma.complaint.updateMany({
      where: { id: complaintId, assignedStaffId: staffId },
      data: { status: "WORKED" },
    });

    if (!result.count) {
      return res.status(404).json({ message: "Assigned complaint was not found for this staff" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    res.json({ data: complaint, message: "job started" });
  } catch (error) {
    next(error);
  }
};

exports.completeTask = async (req, res, next) => {
  try {
    const { complaintId, staffId } = req.body;

    if (!complaintId || !staffId) {
      return res.status(400).json({ message: "complaintId and staffId are required" });
    }

    const result = await prisma.complaint.updateMany({
      where: { id: complaintId, assignedStaffId: staffId },
      data: { status: "RESOLVED" },
    });

    if (!result.count) {
      return res.status(404).json({ message: "Assigned complaint was not found for this staff" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    res.json({ data: complaint, message: "task completed for resident recheck" });
  } catch (error) {
    next(error);
  }
};
