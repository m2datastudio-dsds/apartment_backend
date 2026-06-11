const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

exports.triggerPanic = async (req, res, next) => {
  try {
    const {
      apartmentId,
      flatId,
      residentId,
      residentName,
      flatLabel,
      mobileNumber,
      type,
      status,
      message,
    } = req.body;

    if (!apartmentId || !message) {
      return res.status(400).json({ message: "apartmentId and message are required" });
    }

    const event = await prisma.emergencyEvent.create({
      data: {
        apartmentId,
        flatId: flatId || null,
        residentId: residentId || null,
        residentName: cleanText(residentName) || null,
        flatLabel: cleanText(flatLabel) || null,
        mobileNumber: cleanText(mobileNumber) || null,
        type: cleanText(type) || "PANIC_ALERT",
        status: cleanText(status) || "OPEN",
        message: cleanText(message),
      },
    });

    res.status(201).json({ data: event, message: "panic alert triggered" });
  } catch (error) {
    next(error);
  }
};

exports.respondToEmergency = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { responderId, responderName, responderRole, responseMessage } = req.body;

    const event = await prisma.emergencyEvent.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ message: "emergency alert not found" });
    }

    const updated = await prisma.emergencyEvent.update({
      where: { id },
      data: {
        status: "RESPONDED",
        responseMessage: cleanText(responseMessage) || "Response team is on the way.",
        respondedById: responderId || null,
        respondedByName: cleanText(responderName) || "Response Team",
        respondedByRole: cleanText(responderRole) || "Responder",
        respondedAt: new Date(),
      },
    });

    res.json({ data: updated, message: "response sent to resident" });
  } catch (error) {
    next(error);
  }
};

exports.getEmergencyEvents = async (req, res, next) => {
  try {
    const { apartmentId, residentId, status } = req.query;
    const events = await prisma.emergencyEvent.findMany({
      where: {
        ...(apartmentId ? { apartmentId } : {}),
        ...(residentId ? { residentId } : {}),
        ...(status ? { status: String(status).toUpperCase() } : {}),
      },
      orderBy: { triggeredAt: "desc" },
    });

    res.json({ data: events, message: "success" });
  } catch (error) {
    next(error);
  }
};
