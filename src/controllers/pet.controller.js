const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.getPets = async (req, res, next) => {
  try {
    const { status, flat } = req.query;
    const pets = await prisma.pet.findMany({
      where: {
        ...(status ? { status: { equals: String(status), mode: "insensitive" } } : {}),
        ...(flat ? { flat: { equals: String(flat), mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ pets });
  } catch (error) {
    next(error);
  }
};

exports.registerPet = async (req, res, next) => {
  try {
    const { name, type, breed, flat, ownerName, documentName, documentType, documentData } = req.body;

    if (!name || !type || !flat) {
      return res.status(400).json({ message: "Pet name, type, and flat are required" });
    }

    const pet = await prisma.pet.create({
      data: {
        name: String(name).trim(),
        type,
        breed: breed || "",
        flat: String(flat).trim(),
        ownerName: ownerName || "Resident",
        status: "Pending",
        vaccineStatus: documentName || documentData ? "Uploaded" : "Due",
        documentName: documentName || "",
        documentType: documentType || null,
        documentData: documentData || null,
      },
    });

    res.status(201).json({ message: "Pet registered successfully", pet });
  } catch (error) {
    next(error);
  }
};

exports.updatePetStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const pet = await prisma.pet.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ message: "Pet status updated successfully", pet });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Pet not found" });
    }
    next(error);
  }
};

exports.uploadPetDocument = async (req, res, next) => {
  try {
    const { petId, documentName, documentType, documentData } = req.body;

    if (!petId) {
      return res.status(400).json({ message: "Pet selection is required" });
    }

    const pet = await prisma.pet.update({
      where: { id: petId },
      data: {
        documentName: documentName || "pet-document.pdf",
        documentType: documentType || null,
        documentData: documentData || null,
        vaccineStatus: "Uploaded",
      },
    });

    res.json({ message: "Pet document uploaded successfully", pet });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Pet not found" });
    }
    next(error);
  }
};

exports.sendPetPolicy = async (req, res, next) => {
  try {
    const { title, audience, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Policy title and message are required" });
    }

    const policy = await prisma.petPolicy.create({
      data: {
        title: String(title).trim(),
        audience: audience || "All residents",
        message: String(message).trim(),
      },
    });

    res.status(201).json({ message: "Pet policy sent successfully", policy });
  } catch (error) {
    next(error);
  }
};

exports.getPetPolicies = async (_req, res, next) => {
  try {
    const policies = await prisma.petPolicy.findMany({
      orderBy: { sentOn: "desc" },
    });

    res.json({ policies });
  } catch (error) {
    next(error);
  }
};
