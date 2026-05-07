try {
  require("dotenv").config();
} catch (_error) {
  // dotenv is optional in this scaffold.
}

const app = require("./app");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing backend process, then run npm start again.`);
    process.exit(1);
  }

  console.error("Unable to start server:", error);
  process.exit(1);
});
