const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// Environment Variables from Render
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PAGE_ACCESS_TOKEN  = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN       = process.env.VERIFY_TOKEN;

// Initialize OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://render.com", 
    "X-Title": "Messenger Bot",
  }
});

app.get("/", (req, res) => res.send("Bot is running on OpenRouter!"));

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
      const userMessage = event.message.text;

      try {
        // Request response from OpenRouter
        const completion = await openai.chat.completions.create({
          model: "google/gemini-2.0-flash-lite-preview:free", 
          messages: [{ role: "user", content: userMessage }],
        });

        const replyText = completion.choices[0].message.content;

        // Send response back to Facebook
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
        console.error("OpenRouter API Error:", err.message);
      }
    }
  }
  res.sendStatus(200);
});

// FIXED: Port binding for Render deployment
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server successfully listening on port " + PORT);
});