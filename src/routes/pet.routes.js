const { Router } = require("express");
const petController = require("../controllers/pet.controller");

const router = Router();

router.get("/", petController.getPets);
router.post("/", petController.registerPet);
router.patch("/:id/status", petController.updatePetStatus);
router.post("/upload-document", petController.uploadPetDocument);
router.get("/policies", petController.getPetPolicies);
router.post("/policies", petController.sendPetPolicy);

module.exports = router;
