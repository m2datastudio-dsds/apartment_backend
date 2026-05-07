const { Router } = require("express");
const controller = require("../controllers/communityTalent.controller");

const router = Router();

router.get("/profiles", controller.getProfiles);
router.post("/profiles", controller.createProfile);
router.patch("/profiles/:id/feature", controller.approveFeature);
router.patch("/profiles/:id/feedback", controller.sendFeedback);

module.exports = router;
