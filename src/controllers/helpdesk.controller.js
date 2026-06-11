const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const tokenize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

const scoreFaq = (faq, question) => {
  const words = tokenize(question);
  const faqText = `${faq.question || ""} ${faq.answer || ""}`.toLowerCase();
  return words.reduce((score, word) => score + (faqText.includes(word) ? 1 : 0), 0);
};

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

exports.askFaq = async (req, res, next) => {
  try {
    const { apartmentId, question } = req.body;

    if (!apartmentId || !question?.trim()) {
      return res.status(400).json({ message: "apartmentId and question are required" });
    }

    const faqs = await prisma.faqArticle.findMany({
      where: { apartmentId },
      orderBy: { createdAt: "desc" },
    });

    const rankedFaqs = faqs
      .map((faq) => ({ faq, score: scoreFaq(faq, question) }))
      .filter((item) => item.score > 0)
      .sort((first, second) => second.score - first.score);

    if (!rankedFaqs.length) {
      return res.json({
        data: {
          matched: false,
          question,
          answer:
            "I could not find an apartment FAQ answer for this question yet. Please ask the apartment admin or association member to add this question and answer in Helpdesk FAQ so residents can get an instant answer next time.",
          sourceFaq: null,
        },
        message: "no faq match",
      });
    }

    const sourceFaq = rankedFaqs[0].faq;
    const relatedFaqs = rankedFaqs.slice(1, 3).map((item) => item.faq);

    res.json({
      data: {
        matched: true,
        question,
        answer: [
          `Based on your apartment FAQ, here is the answer:`,
          sourceFaq.answer,
          relatedFaqs.length
            ? `Related FAQ topics: ${relatedFaqs.map((faq) => faq.question).join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        sourceFaq,
        relatedFaqs,
      },
      message: "faq answer generated",
    });
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

exports.answerTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { answer } = req.body;

    if (!answer?.trim()) {
      return res.status(400).json({ message: "answer is required" });
    }

    const existingTicket = await prisma.helpdeskTicket.findUnique({
      where: { id: ticketId },
    });

    if (!existingTicket) {
      return res.status(404).json({ message: "ticket not found" });
    }

    const faq = await prisma.faqArticle.create({
      data: {
        apartmentId: existingTicket.apartmentId,
        question: existingTicket.subject,
        answer: answer.trim(),
      },
    });

    const ticket = await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: {
        answer: answer.trim(),
        answeredAt: new Date(),
        answerFaqId: faq.id,
        status: "CLOSED",
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
    });

    res.json({ data: { ticket, faq }, message: "answer saved and added to FAQ" });
  } catch (error) {
    next(error);
  }
};
