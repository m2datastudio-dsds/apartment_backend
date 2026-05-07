const { Router } = require("express");
const controller = require("../controllers/locationAdmin.controller");

const router = Router();

router.get("/dashboard", controller.getDashboard);
router.get("/apartments", controller.getApartments);
router.post("/apartments", controller.createApartment);

module.exports = router;
