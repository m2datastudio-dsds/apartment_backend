const { Router } = require("express");
const controller = require("../controllers/staff.controller");

const router = Router();

router.get("/dashboard", controller.getDashboard);
router.get("/complaints", controller.getComplaints);
router.post("/tasks/start", controller.startJob);
router.post("/tasks/work-proof", controller.submitWorkProof);
router.post("/tasks/complete", controller.completeTask);

module.exports = router;
