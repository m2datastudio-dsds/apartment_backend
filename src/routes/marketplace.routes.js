const { Router } = require("express");
const marketplaceController = require("../controllers/marketplace.controller");

const router = Router();

router.get("/", marketplaceController.getMarketplaceItems);
router.get("/:id", marketplaceController.getMarketplaceItemById);
router.post("/", marketplaceController.createMarketplaceItem);
router.patch("/:id", marketplaceController.updateMarketplaceItem);
router.delete("/:id", marketplaceController.deleteMarketplaceItem);

module.exports = router;
