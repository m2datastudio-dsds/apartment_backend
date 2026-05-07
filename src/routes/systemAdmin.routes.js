const { Router } = require("express");
const controller = require("../controllers/systemAdmin.controller");

const router = Router();

router.get("/dashboard", controller.getDashboard);
router.get("/reports", controller.getGlobalReports);
router.get("/health", controller.getSystemHealth);
router.get("/activity-logs", controller.getActivityLogs);
router.get("/super-admins", controller.getSuperAdmins);
router.post("/super-admins", controller.createSuperAdmin);

module.exports = router;
