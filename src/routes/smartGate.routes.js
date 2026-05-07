const { Router } = require("express");
const smartGateController = require("../controllers/smartGate.controller");

const router = Router();

router.get("/", smartGateController.getGatePasses);
router.get("/:id", smartGateController.getGatePassById);
router.post("/", smartGateController.createGatePass);
router.patch("/:id", smartGateController.updateGatePass);
router.patch("/:id/status", smartGateController.updateGatePassStatus);
router.delete("/:id", smartGateController.deleteGatePass);

module.exports = router;
