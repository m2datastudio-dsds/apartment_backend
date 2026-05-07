const { Router } = require("express");
const controller = require("../controllers/resident.controller");

const router = Router();

router.get("/dashboard", controller.getDashboard);
router.get("/maintenance", controller.getMaintenance);
router.post("/maintenance/pay", controller.payMaintenance);
router.get("/complaints", controller.getComplaints);
router.post("/complaints", controller.raiseComplaint);
router.post("/complaints/recheck", controller.recheckComplaint);

module.exports = router;
