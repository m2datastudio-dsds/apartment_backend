const { Router } = require("express");
const membershipController = require("../controllers/membership.controller");

const router = Router();

router.get("/plans", membershipController.getMembershipPlans);
router.get("/plans/:id", membershipController.getMembershipPlanById);
router.post("/plans", membershipController.createMembershipPlan);
router.patch("/plans/:id", membershipController.updateMembershipPlan);
router.delete("/plans/:id", membershipController.deleteMembershipPlan);
router.post("/subscribe", membershipController.subscribeMembershipPlan);
router.get("/subscriptions", membershipController.getMembershipSubscriptions);

module.exports = router;
