// backend/src/routes/whatsappRoutes.js

const express = require("express");
const router = express.Router();

/**
 * Webhook verification endpoint (GET)
 * Meta sends a GET request to verify the webhook
 */
router.get("/webhook", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("📩 Webhook verification request:");
    console.log("  - Mode:", mode);
    console.log("  - Token:", token);
    console.log("  - Challenge:", challenge);

    // Check if token matches
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully!");
      res.status(200).send(challenge);
    } else {
      console.warn("⚠️ Webhook verification failed - token mismatch");
      res.sendStatus(403);
    }
  } catch (error) {
    console.error("❌ Webhook verification error:", error);
    res.sendStatus(500);
  }
});

/**
 * Webhook for incoming messages (POST)
 * Meta sends POST requests when messages arrive
 */
router.post("/webhook", (req, res) => {
  try {
    const body = req.body;
    console.log("📩 Webhook received:", JSON.stringify(body, null, 2));

    // Check if this is an event from a page subscription
    if (body.object) {
      // Handle incoming messages
      if (body.entry && body.entry[0].changes) {
        const changes = body.entry[0].changes[0];

        if (changes.field === "messages") {
          const value = changes.value;
          if (value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            console.log("📩 New WhatsApp message:", message);

            // TODO: Handle incoming messages (reply, etc.)
            // You can call your notification service here
          }
        }
      }

      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.sendStatus(500);
  }
});

module.exports = router;
