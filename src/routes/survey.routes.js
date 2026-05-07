const { Router } = require("express");
const controller = require("../controllers/survey.controller");

const router = Router();

router.get("/", controller.listSurveys);
router.get("/export", controller.exportResults);
router.post("/", controller.createSurvey);
router.post("/:surveyId/responses", controller.submitResponse);
router.get("/:surveyId/results", controller.getResults);

module.exports = router;
