const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN;

// Initialize official SDK
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Use 'gemini-3-flash' to match your 20 RPD dashboard quota
const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

app.get("/", (req, res) => {
  res.send("Bot is online!");
});

// Facebook Webhook Verification
app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

// Incoming Message Handling
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);

  for (const entry of body.entry) {
    if (!entry.messaging) continue;
    const event = entry.messaging[0];
    const senderId = event.sender.id;
    
    if (event.message && event.message.text) {
      try {
        const result = await model.generateContent(event.message.text);
        const replyText = result.response.text();
        
        // FIXED: Using a clean URL string to avoid SyntaxErrors
        const fbUrl = "https://graph.facebook.com/v18.0/me/messages?access_token=" + PAGE_ACCESS_TOKEN;
        
        await fetch(fbUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: senderId },
            message:   { text: replyText },
          }),
        });
      } catch (err) {
        console.error("API Error:", err.message);
      }
    }
  }
  res.sendStatus(200);
});

// FIXED: Port binding for Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});