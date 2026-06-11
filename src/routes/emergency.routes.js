const { Router } = require("express");
const controller = require("../controllers/emergency.controller");

const router = Router();

router.post("/panic", controller.triggerPanic);
router.patch("/events/:id/respond", controller.respondToEmergency);
router.get("/events", controller.getEmergencyEvents);

module.exports = router;
