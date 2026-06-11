const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.getDeliveries = async (req, res, next) => {
  try {
    const { status, flat } = req.query;
    const deliveries = await prisma.deliveryRecord.findMany({
      where: {
        ...(status ? { status: { equals: String(status), mode: "insensitive" } } : {}),
        ...(flat ? { flat: { equals: String(flat), mode: "insensitive" } } : {}),
      },
      orderBy: { requestedOn: "desc" },
    });

    res.json({ deliveries });
  } catch (error) {
    next(error);
  }
};

exports.getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await prisma.deliveryRecord.findUnique({
      where: { id: req.params.id },
    });

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    res.json({ delivery });
  } catch (error) {
    next(error);
  }
};

exports.createDelivery = async (req, res, next) => {
  try {
    const {
      partner,
      trackingId,
      flat,
      residentName,
      deliveryType,
      expectedTime,
      note,
    } = req.body;

    if (!partner || !flat || !deliveryType) {
      return res.status(400).json({
        message: "Partner, flat, and delivery type are required",
      });
    }

    const delivery = await prisma.deliveryRecord.create({
      data: {
        partner: String(partner).trim(),
        trackingId: trackingId || "",
        flat: String(flat).trim(),
        residentName: residentName || "Resident",
        status: "Expected",
        deliveryType,
        expectedTime: expectedTime || "",
        note: note || "",
      },
    });

    res.status(201).json({
      message: "Delivery created successfully",
      delivery,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.deliveryRecord.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({
      message: "Delivery updated successfully",
      delivery,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Delivery not found" });
    }
    next(error);
  }
};

exports.updateDeliveryStatus = async (req, res, next) => {
  try {
    const {
      status,
      pickupStaffId,
      pickupStaffName,
      pickupStaffUserId,
      pickupStaffPhone,
      residentReceivedName,
    } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const normalizedStatus = String(status).toLowerCase();
    const isPickup = normalizedStatus === "picked up";
    const isResidentReceived = normalizedStatus === "resident received";

    const delivery = await prisma.deliveryRecord.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(isPickup
          ? {
              pickupStaffId: pickupStaffId || null,
              pickupStaffName: pickupStaffName || "Staff",
              pickupStaffUserId: pickupStaffUserId || null,
              pickupStaffPhone: pickupStaffPhone || null,
              pickedUpAt: new Date(),
            }
          : {}),
        ...(isResidentReceived
          ? {
              residentReceivedName: residentReceivedName || "Resident",
              residentReceivedAt: new Date(),
            }
          : {}),
      },
    });

    res.json({
      message: "Delivery status updated successfully",
      delivery,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Delivery not found" });
    }
    next(error);
  }
};

exports.deleteDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.deliveryRecord.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: "Delivery deleted successfully",
      delivery,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Delivery not found" });
    }
    next(error);
  }
};
