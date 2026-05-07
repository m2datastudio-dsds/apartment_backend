const { Router } = require("express");
const controller = require("../controllers/visitor.controller");

const router = Router();

router.post("/passes", controller.createVisitorPass);
router.post("/approve-otp", controller.approveVisitorOtp);
router.patch("/:id/decision", controller.decideVisitorEntry);
router.patch("/:id/accept-entry", controller.acceptVisitorEntry);
router.patch("/:id/accept-exit", controller.acceptVisitorExit);
router.get("/logs", controller.getVisitorLogs);

module.exports = router;
