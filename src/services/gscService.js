const { google } = require("googleapis");
const { auth } = require("google-auth-library");
const path = require("path");
const fs = require("fs");

class GSCService {
  constructor() {
    this.auth = null;
    this.searchConsole = null;
    this.siteUrl = process.env.GSC_SITE_URL || "https://eleganceperfumes.com/";
  }

  /**
   * Initialize the GSC client with OAuth2 credentials
   */
  async initialize() {
    try {
      let authClient;

      // ✅ Check if we're on Railway (no file system) or local development
      if (
        process.env.NODE_ENV === "production" &&
        process.env.GOOGLE_CREDENTIALS_JSON
      ) {
        // Railway: Use environment variable with JSON string
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        authClient = new auth.GoogleAuth({
          credentials: credentials,
          scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        });
        console.log("✅ GSC initialized with Railway environment variable");
      } else {
        // Local development: Use file
        const keyFilePath = path.join(__dirname, "../../credentials.json");
        if (fs.existsSync(keyFilePath)) {
          authClient = new auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
          });
          console.log("✅ GSC initialized with credentials file");
        } else {
          console.warn("⚠️ credentials.json not found, using fallback mode");
          // Fallback: Use client ID/secret from .env with OAuth2
          authClient = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "http://localhost:5000/auth/google/callback",
          );
          // Set credentials if refresh token is available
          if (process.env.GOOGLE_REFRESH_TOKEN) {
            authClient.setCredentials({
              refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
            });
          }
        }
      }

      this.auth = authClient;
      this.searchConsole = google.searchconsole({
        version: "v1",
        auth: authClient,
      });

      console.log("✅ GSC Service initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ GSC initialization failed:", error.message);
      throw error;
    }
  }

  /**
   * Get list of verified sites
   */
  async getSites() {
    try {
      const response = await this.searchConsole.sites.list();
      return response.data.siteEntry || [];
    } catch (error) {
      console.error("❌ Failed to get sites:", error.message);
      throw error;
    }
  }

  /**
   * Query search analytics for keyword data
   */
  async getSearchAnalytics({
    startDate = "30-days-ago",
    endDate = "today",
    dimensions = ["query"],
    rowLimit = 50,
    orderBy = "clicks",
    descending = true,
    dimensionFilters = [],
  }) {
    try {
      // Format dates
      const start = this.formatDate(startDate);
      const end = this.formatDate(endDate);

      const requestBody = {
        startDate: start,
        endDate: end,
        dimensions: dimensions,
        rowLimit: rowLimit,
        orderBy: [{ field: orderBy, descending: descending }],
      };

      // Add dimension filters if provided
      if (dimensionFilters.length > 0) {
        requestBody.dimensionFilterGroups = [
          {
            filters: dimensionFilters.map((filter) => ({
              dimension: filter.dimension,
              expression: filter.expression,
              operator: filter.operator || "equals",
            })),
          },
        ];
      }

      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: requestBody,
      });

      return response.data.rows || [];
    } catch (error) {
      console.error("❌ Failed to get search analytics:", error.message);
      throw error;
    }
  }

  /**
   * Get keyword rankings specifically
   */
  async getKeywordRankings(limit = 50) {
    try {
      const rows = await this.getSearchAnalytics({
        dimensions: ["query"],
        rowLimit: limit,
        orderBy: "clicks",
        descending: true,
      });

      return rows.map((row) => ({
        keyword: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr ? (row.ctr * 100).toFixed(2) + "%" : "0%",
        position: row.position ? parseFloat(row.position.toFixed(1)) : 0,
      }));
    } catch (error) {
      console.error("❌ Failed to get keyword rankings:", error.message);
      return [];
    }
  }

  /**
   * Get page-specific keyword data
   */
  async getPageKeywordData(pagePath, limit = 20) {
    try {
      const rows = await this.getSearchAnalytics({
        dimensions: ["query"],
        rowLimit: limit,
        orderBy: "clicks",
        descending: true,
        dimensionFilters: [
          {
            dimension: "page",
            expression: pagePath,
            operator: "equals",
          },
        ],
      });

      return rows.map((row) => ({
        keyword: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr ? (row.ctr * 100).toFixed(2) + "%" : "0%",
        position: row.position ? parseFloat(row.position.toFixed(1)) : 0,
      }));
    } catch (error) {
      console.error("❌ Failed to get page keyword data:", error.message);
      return [];
    }
  }

  /**
   * Format date for GSC API
   */
  formatDate(date) {
    if (date === "today") {
      return new Date().toISOString().split("T")[0];
    }
    if (date === "30-days-ago") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split("T")[0];
    }
    if (date === "7-days-ago") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    }
    if (date === "90-days-ago") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return d.toISOString().split("T")[0];
    }
    return date;
  }

  /**
   * Get overall performance summary
   */
  async getPerformanceSummary() {
    try {
      const rows = await this.getSearchAnalytics({
        dimensions: [],
        rowLimit: 1,
      });

      if (rows.length === 0) {
        return { clicks: 0, impressions: 0, ctr: "0%", position: 0 };
      }

      const row = rows[0];
      return {
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr ? (row.ctr * 100).toFixed(2) + "%" : "0%",
        position: row.position ? parseFloat(row.position.toFixed(1)) : 0,
      };
    } catch (error) {
      console.error("❌ Failed to get performance summary:", error.message);
      return { clicks: 0, impressions: 0, ctr: "0%", position: 0 };
    }
  }
}

module.exports = new GSCService();
