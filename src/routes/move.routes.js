const { Router } = require("express");
const controller = require("../controllers/move.controller");

const router = Router();

router.get("/requests", controller.listMoveRequests);
router.post("/requests", controller.requestMove);
router.patch("/requests/:requestId/review", controller.reviewMoveRequest);
router.post("/requests/:requestId/inspection", controller.completeInspection);

module.exports = router;
