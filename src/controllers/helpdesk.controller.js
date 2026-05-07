const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.createFaq = async (req, res, next) => {
  try {
    const { apartmentId, question, answer } = req.body;

    if (!apartmentId || !question?.trim() || !answer?.trim()) {
      return res.status(400).json({ message: "apartmentId, question, and answer are required" });
    }

    const faq = await prisma.faqArticle.create({ data: { apartmentId, question, answer } });
    res.status(201).json({ data: faq, message: "faq created" });
  } catch (error) {
    next(error);
  }
};

exports.searchFaq = async (req, res, next) => {
  try {
    const q = req.query.q || "";
    const { apartmentId } = req.query;
    const faqs = await prisma.faqArticle.findMany({
      where: {
        ...(apartmentId ? { apartmentId } : {}),
        OR: [
          { question: { contains: q, mode: "insensitive" } },
          { answer: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: faqs, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.createTicket = async (req, res, next) => {
  try {
    const { apartmentId, residentId, subject, description } = req.body;

    if (!apartmentId || !residentId || !subject?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "apartmentId, residentId, subject, and description are required" });
    }

    const ticket = await prisma.helpdeskTicket.create({
      data: { apartmentId, residentId, subject, description },
    });
    res.status(201).json({ data: ticket, message: "ticket created" });
  } catch (error) {
    next(error);
  }
};

exports.listTickets = async (req, res, next) => {
  try {
    const { apartmentId, residentId } = req.query;

    if (!apartmentId && !residentId) {
      return res.status(400).json({ message: "apartmentId or residentId is required" });
    }

    const tickets = await prisma.helpdeskTicket.findMany({
      where: {
        ...(apartmentId ? { apartmentId } : {}),
        ...(residentId ? { residentId } : {}),
      },
      include: {
        resident: {
          select: {
            name: true,
            userId: true,
            flat: {
              select: { number: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: tickets, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!status?.trim()) {
      return res.status(400).json({ message: "status is required" });
    }

    const ticket = await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: { status: status.trim().toUpperCase() },
    });

    res.json({ data: ticket, message: "ticket status updated" });
  } catch (error) {
    next(error);
  }
};
