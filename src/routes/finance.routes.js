const { Router } = require("express");
const controller = require("../controllers/finance.controller");

const router = Router();

router.post("/maintenance/setup", controller.setupMaintenance);
router.post("/maintenance/generate", controller.generateMaintenance);
router.post("/maintenance/pay", controller.recordPayment);
router.get("/maintenance", controller.getMaintenance);
router.get("/balance-sheet", controller.getBalanceSheet);
router.post("/entries", controller.createFinanceEntry);

module.exports = router;
