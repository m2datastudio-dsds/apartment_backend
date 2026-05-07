const { Router } = require("express");
const controller = require("../controllers/helpdesk.controller");

const router = Router();

router.post("/faq", controller.createFaq);
router.get("/faq/search", controller.searchFaq);
router.get("/tickets", controller.listTickets);
router.post("/tickets", controller.createTicket);
router.patch("/tickets/:ticketId/status", controller.updateTicketStatus);

module.exports = router;
