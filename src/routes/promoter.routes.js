const { Router } = require("express");
const controller = require("../controllers/promoter.controller");
const { requireAuth, requireRole } = require("../utils/auth");

const router = Router();

router.use(requireAuth, requireRole("PROMOTER"));

router.get("/dashboard", controller.getDashboard);
router.get("/reports", controller.getReports);
router.get("/analytics", controller.getAnalytics);
router.get("/audit-logs", controller.getAuditLogs);
router.get("/locations", controller.getLocations);
router.post("/locations", controller.createLocation);
router.get("/apartments", controller.getApartments);
router.post("/apartments", controller.createApartment);

module.exports = router;
