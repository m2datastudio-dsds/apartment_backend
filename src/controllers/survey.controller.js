const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.createSurvey = async (req, res, next) => {
  try {
    const { apartmentId, title } = req.body;

    if (!apartmentId || !title?.trim()) {
      return res.status(400).json({ message: "apartmentId and title are required" });
    }

    const survey = await prisma.survey.create({ data: { apartmentId, title } });
    res.status(201).json({ data: survey, message: "survey created" });
  } catch (error) {
    next(error);
  }
};

exports.listSurveys = async (req, res, next) => {
  try {
    const { apartmentId, residentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const surveys = await prisma.survey.findMany({
      where: { apartmentId },
      include: {
        responses: {
          select: {
            id: true,
            residentId: true,
            answer: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = surveys.map((survey) => {
      const currentResidentResponse = residentId
        ? survey.responses.find((response) => response.residentId === residentId)
        : null;

      return {
        id: survey.id,
        apartmentId: survey.apartmentId,
        title: survey.title,
        createdAt: survey.createdAt,
        totalResponses: survey.responses.length,
        response: currentResidentResponse || null,
      };
    });

    res.json({ data, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.submitResponse = async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const { residentId, answer } = req.body;

    if (!residentId || !answer?.trim()) {
      return res.status(400).json({ message: "residentId and answer are required" });
    }

    const response = await prisma.surveyResponse.create({ data: { surveyId, residentId, answer } });
    res.status(201).json({ data: response, message: "response submitted" });
  } catch (error) {
    next(error);
  }
};

exports.getResults = async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const [survey, totalResponses] = await Promise.all([
      prisma.survey.findUnique({ where: { id: surveyId } }),
      prisma.surveyResponse.count({ where: { surveyId } }),
    ]);
    res.json({ data: { survey, totalResponses }, message: "success" });
  } catch (error) {
    next(error);
  }
};

exports.exportResults = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const surveys = await prisma.survey.findMany({
      where: { apartmentId },
      include: {
        responses: {
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
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = surveys.flatMap((survey) =>
      survey.responses.length
        ? survey.responses.map((response) => ({
            surveyId: survey.id,
            surveyTitle: survey.title,
            residentName: response.resident?.name || "-",
            residentUserId: response.resident?.userId || "-",
            flatNumber: response.resident?.flat?.number || "-",
            answer: response.answer,
            submittedAt: response.createdAt,
          }))
        : [
            {
              surveyId: survey.id,
              surveyTitle: survey.title,
              residentName: "-",
              residentUserId: "-",
              flatNumber: "-",
              answer: "No responses",
              submittedAt: null,
            },
          ]
    );

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      ["Survey ID", "Survey Title", "Resident", "Resident ID", "Flat", "Answer", "Submitted At"],
      ...rows.map((row) => [
        row.surveyId,
        row.surveyTitle,
        row.residentName,
        row.residentUserId,
        row.flatNumber,
        row.answer,
        row.submittedAt ? row.submittedAt.toISOString() : "",
      ]),
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    res.json({ data: { rows, csv }, message: "success" });
  } catch (error) {
    next(error);
  }
};
