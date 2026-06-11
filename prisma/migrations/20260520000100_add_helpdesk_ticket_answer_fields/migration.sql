ALTER TABLE "HelpdeskTicket"
ADD COLUMN "answer" TEXT,
ADD COLUMN "answeredAt" TIMESTAMP(3),
ADD COLUMN "answerFaqId" TEXT;
