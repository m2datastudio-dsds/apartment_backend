const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.getDashboard = async (req, res, next) => {
  try {
    const { residentId } = req.query;
    const [complaints, bookings] = await Promise.all([
      prisma.complaint.count({ where: residentId ? { residentId } : undefined }),
      prisma.amenityBooking.count({ where: residentId ? { residentId } : undefined }),
    ]);
    res.json({ data: { complaints, bookings }, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.payMaintenance = async (req, res, next) => {
  try {
    const { residentId, billId, paymentMode, receiptNumber, paidAt } = req.body;

    if (!residentId || !billId) {
      return res.status(400).json({ message: "residentId and billId are required" });
    }

    const resident = await prisma.user.findUnique({
      where: { id: residentId },
      select: { flatId: true },
    });

    if (!resident) {
      return res.status(404).json({ message: "Resident was not found" });
    }

    const [bill] = await prisma.$queryRaw`
      UPDATE "MaintenanceBill"
      SET
        "status" = 'PAID',
        "paidAmount" = "amount",
        "paymentMode" = ${paymentMode || "Manual"},
        "receiptNumber" = ${receiptNumber || `RCPT-${Date.now()}`},
        "paidAt" = ${paidAt ? new Date(paidAt) : new Date()},
        "description" = COALESCE("description", '') || ${` | Paid by resident via ${paymentMode || "Manual"}`},
        "updatedAt" = ${paidAt ? new Date(paidAt) : new Date()}
      WHERE "id" = ${billId}
        AND (
          "residentId" = ${residentId}
          OR ("flatId" IS NOT NULL AND "flatId" = ${resident.flatId || null})
        )
      RETURNING *
    `;

    if (!bill) {
      return res.status(404).json({ message: "Pending bill was not found for this resident" });
    }

    res.json({ data: bill, message: "payment recorded" });
  } catch (error) {
    next(error);
  }
};

exports.getMaintenance = async (req, res, next) => {
  try {
    const { residentId } = req.query;

    if (!residentId) {
      return res.status(400).json({ message: "residentId is required" });
    }

    const residentAccount = await prisma.user.findUnique({
      where: { id: residentId },
      select: { flatId: true },
    });

    if (!residentAccount) {
      return res.status(404).json({ message: "Resident was not found" });
    }

    const bills = await prisma.$queryRaw`
      SELECT
        bill.*,
        apartment."name" AS "apartmentName",
        resident."userId",
        resident."name" AS "residentName",
        flat."number" AS "flatNumber",
        flat."squareFeet",
        block."name" AS "blockName"
      FROM "MaintenanceBill" bill
      JOIN "Apartment" apartment ON apartment."id" = bill."apartmentId"
      LEFT JOIN "User" resident ON resident."id" = bill."residentId"
      LEFT JOIN "Flat" flat ON flat."id" = COALESCE(bill."flatId", resident."flatId")
      LEFT JOIN "Block" block ON block."id" = flat."blockId"
      WHERE bill."residentId" = ${residentId}
        OR (bill."flatId" IS NOT NULL AND bill."flatId" = ${residentAccount.flatId || null})
      ORDER BY bill."createdAt" DESC
    `;

    res.json({ data: bills, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.getComplaints = async (req, res, next) => {
  try {
    const { residentId } = req.query;

    if (!residentId) {
      return res.status(400).json({ message: "residentId is required" });
    }

    const complaints = await prisma.complaint.findMany({
      where: { residentId },
      orderBy: { createdAt: "desc" },
      include: {
        apartment: {
          select: { name: true },
        },
        resident: {
          select: {
            flat: {
              select: {
                number: true,
                block: {
                  select: { name: true },
                },
              },
            },
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
        assignedStaff: {
          select: {
            name: true,
            mobileNumber: true,
          },
        },
      },
    });

    res.json({ data: complaints, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.raiseComplaint = async (req, res, next) => {
  try {
    const {
      title,
      description,
      apartmentId,
      flatId,
      residentId,
      residentProofType,
      residentProofName,
      residentProofData,
    } = req.body;

    if (!title || !description || !residentId) {
      return res.status(400).json({ message: "title, description, and residentId are required" });
    }

    const resident = await prisma.user.findUnique({
      where: { id: residentId },
      select: {
        id: true,
        apartmentId: true,
        flatId: true,
      },
    });

    if (!resident) {
      return res.status(404).json({ message: "Resident was not found" });
    }

    const resolvedApartmentId = apartmentId || resident.apartmentId;
    const resolvedFlatId = flatId || resident.flatId;

    if (!resolvedApartmentId) {
      return res.status(400).json({ message: "Resident apartment information is missing" });
    }

    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        apartmentId: resolvedApartmentId,
        flatId: resolvedFlatId || null,
        residentId,
        residentProofType: residentProofType || null,
        residentProofName: residentProofName || null,
        residentProofData: residentProofData || null,
      },
    });
    res.status(201).json({ data: complaint, message: "complaint created" });
  } catch (error) {
    next(error);
  }
};

exports.recheckComplaint = async (req, res, next) => {
  try {
    const { complaintId, residentId, reviewDecision, reworkNotes } = req.body;

    if (!complaintId || !residentId || !reviewDecision) {
      return res.status(400).json({ message: "complaintId, residentId, and reviewDecision are required" });
    }

    const normalizedDecision = String(reviewDecision).toUpperCase();

    if (!["DONE", "COMPLETED", "REWORK"].includes(normalizedDecision)) {
      return res.status(400).json({ message: "reviewDecision must be DONE, COMPLETED, or REWORK" });
    }

    const complaint = await prisma.complaint.findFirst({
      where: { id: complaintId, residentId },
      select: { id: true, status: true, assignedStaffId: true, staffProofNotes: true },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint was not found for this resident" });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({ message: "Only staff-completed complaints can be rechecked" });
    }

    if (normalizedDecision === "REWORK" && !complaint.assignedStaffId) {
      return res.status(400).json({ message: "Cannot send complaint for rework because no staff is assigned" });
    }

    const reviewLine = [
      complaint.staffProofNotes,
      reworkNotes ? `Resident recheck: ${reworkNotes}` : null,
    ].filter(Boolean).join("\n");

    const isCompleted = normalizedDecision === "DONE" || normalizedDecision === "COMPLETED";
    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: isCompleted ? "COMPLETED" : "ASSIGNED",
        staffProofNotes: reviewLine || complaint.staffProofNotes,
      },
    });

    res.json({
      data: updatedComplaint,
      message: isCompleted ? "complaint completed for admin closure" : "complaint assigned for rework",
    });
  } catch (error) {
    next(error);
  }
};
