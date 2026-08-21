/**
 * Server Entry Point
 * Start the Express server
 */
require("dotenv").config();

const app = require("./app");
const database = require("./config/database");

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    // Connect to database
    await database.connect();

    // Create indexes
    await database.createIndexes();

    // Start server
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 API Version: ${process.env.API_VERSION || "v1"}`);
      console.log(
        `🔗 API URL: http://localhost:${PORT}/api/${process.env.API_VERSION || "v1"}`,
      );
      console.log(`📅 Started at: ${new Date().toISOString()}`);
      console.log("✨ Ready to accept requests!");
    });

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

      // Close server
      if (server) {
        await new Promise((resolve) => {
          server.close(() => {
            console.log("🔌 HTTP server closed");
            resolve();
          });
        });
      }

      // Close database connection
      await database.disconnect();

      console.log("👋 Shutdown complete");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Error handling
    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught Exception:", error);
      shutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for testing
module.exports = { app, server };
