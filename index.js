const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Targeting 'gemini-3-flash' to match the 20 RPD quota in your dashboard
const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

app.get("/", (req, res) => {
  res.send("Bot is active!");
});

app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);

  for (const entry of body.entry) {
    if (!entry.messaging) continue;
    const event    = entry.messaging[0];
    const senderId = event.sender.id;
    
    if (!event.message || !event.message.text) continue;
    const userMessage = event.message.text;

    try {
      const result = await model.generateContent(userMessage);
      const replyText = result.response.text();
      
      // FIXED: Proper string concatenation for the URL
      const url = "https://graph.facebook.com/v18.0/me/messages?access_token=" + PAGE_ACCESS_TOKEN;
      
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderId },
          message:   { text: replyText },
        }),
      });
    } catch (err) {
      console.error("Gemini Error:", err.message);
    }
  }
  res.sendStatus(200);
});

// FIXED: Using 0.0.0.0 to ensure Render detects the open port
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server listening on port " + PORT);
});