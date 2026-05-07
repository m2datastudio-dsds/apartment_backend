const { Router } = require("express");
const controller = require("../controllers/notification.controller");

const router = Router();

router.post("/announcements", controller.sendAnnouncement);
router.get("/announcements", controller.getAnnouncements);
router.post("/events", controller.sendEventNotification);
router.get("/user/:userId", controller.getUserNotifications);

module.exports = router;
