const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");
const { trackError, trackRequest } = require("./utils/systemMetrics");

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(trackRequest);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "apartment-management-system" });
});

app.use("/api", apiRoutes);

app.use((err, _req, res, _next) => {
  trackError();
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
