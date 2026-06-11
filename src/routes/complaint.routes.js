const { Router } = require("express");
const controller = require("../controllers/complaint.controller");
const { requireAuth } = require("../utils/auth");

const router = Router();

router.post("/", controller.raiseComplaint);
router.patch("/:complaintId/assign", requireAuth, controller.assignComplaint);
router.patch("/:complaintId/resolve", controller.resolveComplaint);
router.patch("/:complaintId/close", requireAuth, controller.closeComplaint);

module.exports = router;
