const { Router } = require("express");
const controller = require("../controllers/move.controller");

const router = Router();

router.get("/requests", controller.listMoveRequests);
router.post("/requests", controller.requestMove);
router.patch("/requests/:requestId/review", controller.reviewMoveRequest);
router.patch("/requests/:requestId/assign", controller.assignStaff);
router.post("/requests/:requestId/staff-report", controller.submitStaffReport);
router.post("/requests/:requestId/inspection", controller.completeInspection);

module.exports = router;
