const { Router } = require("express");
const deliveryController = require("../controllers/delivery.controller");

const router = Router();

router.get("/", deliveryController.getDeliveries);
router.get("/:id", deliveryController.getDeliveryById);
router.post("/", deliveryController.createDelivery);
router.patch("/:id", deliveryController.updateDelivery);
router.patch("/:id/status", deliveryController.updateDeliveryStatus);
router.delete("/:id", deliveryController.deleteDelivery);

module.exports = router;
