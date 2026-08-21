/**
 * Database Configuration
 */

const mongoose = require("mongoose");

class Database {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    if (this.isConnected) {
      console.log("📊 Database already connected");
      return this.connection;
    }

    try {
      const mongoURI = process.env.MONGODB_URI;

      if (!mongoURI) {
        throw new Error("MONGODB_URI is not defined in environment variables");
      }

      // Clean and simple options - removed deprecated options
      const options = {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
        w: "majority",
        autoIndex: process.env.NODE_ENV !== "production",
        heartbeatFrequencyMS: 10000,
        bufferCommands: true,
        // Removed: useNewUrlParser, useUnifiedTopology, bufferMaxEntries
      };

      // Set mongoose options
      mongoose.set("strictQuery", true);
      mongoose.set("toJSON", { virtuals: true });
      mongoose.set("toObject", { virtuals: true });
      mongoose.set("debug", process.env.NODE_ENV === "development");

      console.log("📊 Connecting to MongoDB Atlas...");
      this.connection = await mongoose.connect(mongoURI, options);
      this.isConnected = true;

      this.setupEventListeners();
      console.log(`✅ MongoDB Atlas connected successfully`);

      return this.connection;
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error.message);

      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      } else {
        console.log("⚠️ Retrying connection in 5 seconds...");
        setTimeout(() => this.connect(), 5000);
      }
    }
  }

  setupEventListeners() {
    mongoose.connection.on("connected", () => {
      console.log("📊 MongoDB connected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err.message);
      this.isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
      this.isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
      this.isConnected = true;
    });

    process.on("SIGINT", async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    if (!this.isConnected) return;
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      this.connection = null;
      console.log("📊 MongoDB disconnected");
    } catch (error) {
      console.error("❌ MongoDB disconnection error:", error.message);
    }
  }

  getConnectionInfo() {
    const uri = process.env.MONGODB_URI || "";
    const dbName = uri.split("/").pop().split("?")[0] || "elegance";
    const isAtlas = uri.includes("mongodb.net");
    return `${dbName} (${isAtlas ? "Atlas" : "local"})`;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      models: Object.keys(mongoose.models),
    };
  }

  async createIndexes() {
    try {
      console.log("📊 Creating database indexes...");
      const models = mongoose.models;
      for (const [name, model] of Object.entries(models)) {
        try {
          await model.createIndexes();
          console.log(`✅ Indexes created for ${name}`);
        } catch (error) {
          console.error(
            `❌ Failed to create indexes for ${name}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      console.error("❌ Failed to create indexes:", error.message);
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, error: "Database not connected" };
      }
      await mongoose.connection.db.admin().ping();
      return { healthy: true, status: this.getStatus() };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

module.exports = new Database();
