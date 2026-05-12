const { Router } = require("express");
const membershipController = require("../controllers/membership.controller");

const router = Router();

router.get("/plans", membershipController.getMembershipPlans);
router.get("/plan-rules", membershipController.getPlanRules);
router.get("/plans/:id", membershipController.getMembershipPlanById);
router.post("/plans", membershipController.createMembershipPlan);
router.patch("/plans/:id", membershipController.updateMembershipPlan);
router.delete("/plans/:id", membershipController.deleteMembershipPlan);
router.post("/subscribe", membershipController.subscribeMembershipPlan);
router.get("/subscriptions", membershipController.getMembershipSubscriptions);
router.get("/apartment-subscriptions", membershipController.getApartmentSubscriptions);
router.get("/apartment-subscriptions/:apartmentId/status", membershipController.getApartmentSubscriptionStatus);
router.patch("/apartment-subscriptions/:apartmentId", membershipController.assignApartmentSubscription);
router.post("/apartment-subscriptions/:apartmentId/pay", membershipController.payApartmentSubscription);

module.exports = router;
