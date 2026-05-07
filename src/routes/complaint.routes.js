const { Router } = require("express");
const controller = require("../controllers/complaint.controller");

const router = Router();

router.post("/", controller.raiseComplaint);
router.patch("/:complaintId/assign", controller.assignComplaint);
router.patch("/:complaintId/resolve", controller.resolveComplaint);
router.patch("/:complaintId/close", controller.closeComplaint);

module.exports = router;
