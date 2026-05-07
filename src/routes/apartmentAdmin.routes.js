const { Router } = require("express");
const controller = require("../controllers/apartmentAdmin.controller");

const router = Router();

router.get("/dashboard", controller.getDashboard);
router.get("/blocks", controller.getBlocks);
router.get("/block-flat-inventory", controller.getBlockFlatInventory);
router.get("/residents", controller.getResidents);
router.get("/association-members", controller.getAssociationMembers);
router.get("/complaints", controller.getComplaints);
router.get("/staff", controller.getStaff);
router.get("/documents", controller.getDocuments);
router.post("/documents", controller.createDocument);
router.get("/parking", controller.getParkingSlots);
router.post("/parking", controller.createParkingSlot);
router.post("/association-members", controller.createAssociationMember);
router.post("/staff", controller.createStaff);
router.post("/flats", controller.createBlockOrFlat);
router.post("/maintenance/generate", controller.generateMaintenance);

module.exports = router;
