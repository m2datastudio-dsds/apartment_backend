const { Router } = require("express");
const controller = require("../controllers/amenity.controller");

const router = Router();

router.get("/", controller.getAmenities);
router.post("/", controller.createAmenity);
router.patch("/:amenityId/status", controller.updateAmenityStatus);
router.post("/bookings", controller.bookAmenity);
router.patch("/bookings/:bookingId/review", controller.reviewBooking);

module.exports = router;
