const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const { roleWhere } = require("../utils/roles");

const prisma = new PrismaClient();

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFinanceType(type) {
  const normalized = String(type || "").trim().toUpperCase();
  return normalized === "EXPENSE" ? "EXPENSE" : "INCOME";
}

async function generateMaintenanceBills({
  apartmentId,
  billingMonth,
  dueDate,
  description,
  amount,
  lateFee,
  amountMode,
  ratePerSquareFoot,
}) {
  const flats = await prisma.flat.findMany({
    where: { apartmentId },
    include: {
      users: {
        where: {
          apartmentId,
          ...roleWhere("RESIDENT"),
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });
  let generatedCount = 0;
  let skippedCount = 0;

  for (const flat of flats) {
    const resident = flat.users[0] || null;
    const flatSquareFeet = Number(flat.squareFeet || 0);
    const calculatedAmount =
      amountMode === "SQUARE_FEET_RATE"
        ? flatSquareFeet * ratePerSquareFoot
        : amount;

    const [existingBill] = await prisma.$queryRaw`
      SELECT "id"
      FROM "MaintenanceBill"
      WHERE "apartmentId" = ${apartmentId}
        AND "flatId" = ${flat.id}
        AND "billingMonth" = ${billingMonth}
        AND "chargeType" = 'MONTHLY'
      LIMIT 1
    `;

    if (existingBill) {
      await prisma.$queryRaw`
        UPDATE "MaintenanceBill"
        SET
          "residentId" = ${resident?.id || null},
          "amount" = ${calculatedAmount},
          "lateFee" = ${lateFee},
          "dueDate" = ${dueDate ? new Date(dueDate) : null},
          "description" = ${description || "Monthly maintenance"},
          "updatedAt" = NOW()
        WHERE "id" = ${existingBill.id}
      `;
      generatedCount += 1;
      continue;
    }

    await prisma.$queryRaw`
      INSERT INTO "MaintenanceBill" (
        "id",
        "apartmentId",
        "flatId",
        "residentId",
        "billingMonth",
        "chargeType",
        "amount",
        "lateFee",
        "dueDate",
        "description",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${apartmentId},
        ${flat.id},
        ${resident?.id || null},
        ${billingMonth},
        'MONTHLY',
        ${calculatedAmount},
        ${lateFee},
        ${dueDate ? new Date(dueDate) : null},
        ${description || "Monthly maintenance"},
        'PENDING',
        NOW(),
        NOW()
      )
    `;

    generatedCount += 1;
  }

  return {
    apartmentId,
    billingMonth,
    flatsCount: flats.length,
    generatedCount,
    upsertedCount: generatedCount,
    skippedCount,
  };
}

exports.setupMaintenance = async (req, res, next) => {
  try {
    const {
      apartmentId,
      monthlyAmount,
      billingCycle,
      dueDay,
      lateFee,
      notes,
      assignToAllFlats,
      billingMonth,
      dueDate,
      amountMode,
      ratePerSquareFoot,
    } = req.body;
    const parsedAmount = toNumber(monthlyAmount);

    if (!apartmentId || parsedAmount === null) {
      return res.status(400).json({ message: "apartmentId and monthlyAmount are required" });
    }

    const [setting] = await prisma.$queryRaw`
      INSERT INTO "MaintenanceSetting" (
        "id",
        "apartmentId",
        "monthlyAmount",
        "billingCycle",
        "dueDay",
        "lateFee",
        "notes",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${apartmentId},
        ${parsedAmount},
        ${billingCycle || null},
        ${toNumber(dueDay)},
        ${toNumber(lateFee)},
        ${notes || null},
        NOW(),
        NOW()
      )
      ON CONFLICT ("apartmentId") DO UPDATE SET
        "monthlyAmount" = EXCLUDED."monthlyAmount",
        "billingCycle" = EXCLUDED."billingCycle",
        "dueDay" = EXCLUDED."dueDay",
        "lateFee" = EXCLUDED."lateFee",
        "notes" = EXCLUDED."notes",
        "updatedAt" = NOW()
      RETURNING *
    `;

    let generation = null;
    const resolvedAmountMode = amountMode === "FIXED" ? "FIXED" : "SQUARE_FEET_RATE";
    const resolvedRate = toNumber(ratePerSquareFoot) ?? parsedAmount;

    if (assignToAllFlats) {
      generation = await generateMaintenanceBills({
        apartmentId,
        billingMonth: billingMonth || new Date().toISOString().slice(0, 7),
        dueDate,
        description: notes || "Maintenance charge",
        amount: parsedAmount,
        lateFee: toNumber(lateFee),
        amountMode: resolvedAmountMode,
        ratePerSquareFoot: resolvedRate,
      });
    }

    res.status(201).json({
      data: {
        setting,
        generation,
      },
      message: generation ? "maintenance setup saved and assigned to flats" : "maintenance setup saved",
    });
  } catch (error) {
    next(error);
  }
};

exports.generateMaintenance = async (req, res, next) => {
  try {
    const { apartmentId, billingMonth, dueDate, description, amountMode, ratePerSquareFoot } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const resolvedBillingMonth = billingMonth || new Date().toISOString().slice(0, 7);
    const [setting] = await prisma.$queryRaw`
      SELECT *
      FROM "MaintenanceSetting"
      WHERE "apartmentId" = ${apartmentId}
      LIMIT 1
    `;

    if (!setting) {
      return res.status(400).json({ message: "Setup monthly maintenance charges before auto generate" });
    }

    const resolvedAmountMode = amountMode === "FIXED" ? "FIXED" : "SQUARE_FEET_RATE";
    const generation = await generateMaintenanceBills({
      apartmentId,
      billingMonth: resolvedBillingMonth,
      dueDate,
      description,
      amount: Number(setting.monthlyAmount || 0),
      lateFee: setting.lateFee,
      amountMode: resolvedAmountMode,
      ratePerSquareFoot: toNumber(ratePerSquareFoot) ?? Number(setting.monthlyAmount || 0),
    });

    res.json({
      data: generation,
      message: "maintenance generated",
    });
  } catch (error) {
    next(error);
  }
};

exports.extractFlatCharge = async (req, res, next) => {
  try {
    const { apartmentId, flatId, billingMonth, amount, dueDate, description } = req.body;
    const parsedAmount = toNumber(amount);

    if (!apartmentId || !flatId || parsedAmount === null) {
      return res.status(400).json({ message: "apartmentId, flatId, and amount are required" });
    }

    const flat = await prisma.flat.findFirst({
      where: { id: flatId, apartmentId },
      include: {
        users: {
          where: {
            apartmentId,
            ...roleWhere("RESIDENT"),
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!flat) {
      return res.status(404).json({ message: "Selected flat was not found for this apartment" });
    }

    const resolvedBillingMonth = billingMonth || new Date().toISOString().slice(0, 7);
    const resident = flat.users[0] || null;
    const [bill] = await prisma.$queryRaw`
      INSERT INTO "MaintenanceBill" (
        "id",
        "apartmentId",
        "flatId",
        "residentId",
        "billingMonth",
        "chargeType",
        "amount",
        "dueDate",
        "description",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${apartmentId},
        ${flat.id},
        ${resident?.id || null},
        ${resolvedBillingMonth},
        'EXTRA',
        ${parsedAmount},
        ${dueDate ? new Date(dueDate) : null},
        ${description || "Extra spent charge"},
        'PENDING',
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    res.status(201).json({ data: bill, message: "extra spent charge saved separately" });
  } catch (error) {
    next(error);
  }
};

exports.getMaintenance = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const [setting, bills] = await Promise.all([
      prisma.$queryRaw`
        SELECT *
        FROM "MaintenanceSetting"
        WHERE "apartmentId" = ${apartmentId}
        LIMIT 1
      `,
      prisma.$queryRaw`
        SELECT
          bill.*,
          apartment."name" AS "apartmentName",
          resident."userId",
          resident."name" AS "residentName",
          resident."mobileNumber",
          flat."number" AS "flatNumber",
          flat."squareFeet",
          block."name" AS "blockName"
        FROM "MaintenanceBill" bill
        JOIN "Apartment" apartment ON apartment."id" = bill."apartmentId"
        LEFT JOIN "User" resident ON resident."id" = bill."residentId"
        LEFT JOIN "Flat" flat ON flat."id" = COALESCE(bill."flatId", resident."flatId")
        LEFT JOIN "Block" block ON block."id" = flat."blockId"
        WHERE bill."apartmentId" = ${apartmentId}
        ORDER BY bill."createdAt" DESC
      `,
    ]);

    res.json({
      data: {
        setting: setting[0] || null,
        bills,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const { billId, paymentMode, receiptNumber, paidAt } = req.body;

    if (!billId) {
      return res.status(400).json({ message: "billId is required" });
    }

    const [bill] = await prisma.$queryRaw`
      UPDATE "MaintenanceBill"
      SET
        "status" = 'PAID',
        "paidAmount" = "amount",
        "paymentMode" = ${paymentMode || "Manual"},
        "receiptNumber" = ${receiptNumber || `RCPT-${Date.now()}`},
        "paidAt" = ${paidAt ? new Date(paidAt) : new Date()},
        "description" = COALESCE("description", '') || ${` | Paid via ${paymentMode || "Manual"}`},
        "updatedAt" = ${paidAt ? new Date(paidAt) : new Date()}
      WHERE "id" = ${billId}
      RETURNING *
    `;

    if (!bill) {
      return res.status(404).json({ message: "Maintenance bill was not found" });
    }

    res.json({ data: bill, message: "payment recorded" });
  } catch (error) {
    next(error);
  }
};

exports.getBalanceSheet = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const [apartment] = await prisma.$queryRaw`
      SELECT "id", "name"
      FROM "Apartment"
      WHERE "id" = ${apartmentId}
      LIMIT 1
    `;

    if (!apartment) {
      return res.status(404).json({ message: "Apartment was not found" });
    }

    const [entries, paidBills, pendingBills] = await Promise.all([
      prisma.$queryRaw`
        SELECT *
        FROM "FinanceEntry"
        WHERE "apartmentId" = ${apartmentId}
        ORDER BY "entryDate" DESC, "createdAt" DESC
      `,
      prisma.$queryRaw`
        SELECT
          bill.*,
          resident."userId",
          resident."name" AS "residentName",
          flat."number" AS "flatNumber",
          flat."squareFeet",
          block."name" AS "blockName"
        FROM "MaintenanceBill" bill
        LEFT JOIN "User" resident ON resident."id" = bill."residentId"
        LEFT JOIN "Flat" flat ON flat."id" = COALESCE(bill."flatId", resident."flatId")
        LEFT JOIN "Block" block ON block."id" = flat."blockId"
        WHERE bill."apartmentId" = ${apartmentId}
          AND bill."status" = 'PAID'
        ORDER BY bill."paidAt" DESC NULLS LAST, bill."updatedAt" DESC
      `,
      prisma.$queryRaw`
        SELECT *
        FROM "MaintenanceBill"
        WHERE "apartmentId" = ${apartmentId}
          AND COALESCE("status", 'PENDING') <> 'PAID'
      `,
    ]);

    const manualIncome = entries
      .filter((entry) => entry.type === "INCOME")
      .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const expense = entries
      .filter((entry) => entry.type === "EXPENSE")
      .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const maintenanceIncome = paidBills.reduce((total, bill) => total + Number(bill.paidAmount || bill.amount || 0), 0);
    const outstanding = pendingBills.reduce((total, bill) => total + Number(bill.amount || 0), 0);
    const totalIncome = manualIncome + maintenanceIncome;
    const netBalance = totalIncome - expense;

    const transactions = [
      ...paidBills.map((bill) => ({
        id: bill.id,
        type: "INCOME",
        category: bill.chargeType === "EXTRA" ? "Maintenance Extra" : "Maintenance",
        description: `${bill.chargeType === "EXTRA" ? "Extra charge" : "Maintenance"} ${bill.billingMonth || ""}`.trim(),
        amount: Number(bill.paidAmount || bill.amount || 0),
        paymentMode: bill.paymentMode || "Maintenance",
        reference: bill.receiptNumber || bill.userId || null,
        entryDate: bill.paidAt || bill.updatedAt,
        residentName: bill.residentName,
        flatNumber: bill.flatNumber,
        blockName: bill.blockName,
        source: "MAINTENANCE",
      })),
      ...entries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: Number(entry.amount || 0),
        paymentMode: entry.paymentMode,
        reference: entry.reference,
        entryDate: entry.entryDate,
        source: "LEDGER",
      })),
    ].sort((left, right) => new Date(right.entryDate || 0) - new Date(left.entryDate || 0));

    res.json({
      data: {
        apartment,
        summary: {
          manualIncome,
          maintenanceIncome,
          totalIncome,
          expense,
          netBalance,
          outstanding,
          paidBills: paidBills.length,
          pendingBills: pendingBills.length,
        },
        transactions,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.createFinanceEntry = async (req, res, next) => {
  try {
    const { apartmentId, type, category, description, amount, paymentMode, reference, entryDate } = req.body;
    const parsedAmount = toNumber(amount);

    if (!apartmentId || parsedAmount === null) {
      return res.status(400).json({ message: "apartmentId and amount are required" });
    }

    const [entry] = await prisma.$queryRaw`
      INSERT INTO "FinanceEntry" (
        "id",
        "apartmentId",
        "type",
        "category",
        "description",
        "amount",
        "paymentMode",
        "reference",
        "entryDate",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${apartmentId},
        ${normalizeFinanceType(type)},
        ${category || null},
        ${description || null},
        ${parsedAmount},
        ${paymentMode || null},
        ${reference || null},
        ${entryDate ? new Date(entryDate) : new Date()},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    res.status(201).json({ data: entry, message: "finance entry created" });
  } catch (error) {
    next(error);
  }
};
