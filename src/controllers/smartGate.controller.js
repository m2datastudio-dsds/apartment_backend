const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.getGatePasses = async (req, res, next) => {
  try {
    const { status, flat } = req.query;
    const passes = await prisma.smartGatePass.findMany({
      where: {
        ...(status ? { status: { equals: String(status), mode: "insensitive" } } : {}),
        ...(flat ? { flat: { equals: String(flat), mode: "insensitive" } } : {}),
      },
      orderBy: { requestedOn: "desc" },
    });

    res.json({ passes });
  } catch (error) {
    next(error);
  }
};

exports.getGatePassById = async (req, res, next) => {
  try {
    const pass = await prisma.smartGatePass.findUnique({
      where: { id: req.params.id },
    });

    if (!pass) {
      return res.status(404).json({ message: "Gate pass not found" });
    }

    res.json({ pass });
  } catch (error) {
    next(error);
  }
};

exports.createGatePass = async (req, res, next) => {
  try {
    const {
      gate,
      type,
      visitorName,
      flat,
      residentName,
      expectedTime,
      note,
    } = req.body;

    if (!type || !visitorName || !flat) {
      return res.status(400).json({
        message: "Type, visitor name, and flat are required",
      });
    }

    const pass = await prisma.smartGatePass.create({
      data: {
        gate: gate || "Main Gate",
        type: String(type).trim(),
        visitorName: String(visitorName).trim(),
        flat: String(flat).trim(),
        residentName: residentName || "Resident",
        status: "Waiting",
        expectedTime: expectedTime || "",
        note: note || "",
      },
    });

    res.status(201).json({
      message: "Gate pass created successfully",
      pass,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateGatePassStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const pass = await prisma.smartGatePass.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({
      message: "Gate pass status updated successfully",
      pass,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Gate pass not found" });
    }
    next(error);
  }
};

exports.updateGatePass = async (req, res, next) => {
  try {
    const pass = await prisma.smartGatePass.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({
      message: "Gate pass updated successfully",
      pass,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Gate pass not found" });
    }
    next(error);
  }
};

exports.deleteGatePass = async (req, res, next) => {
  try {
    const pass = await prisma.smartGatePass.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: "Gate pass deleted successfully",
      pass,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Gate pass not found" });
    }
    next(error);
  }
};
