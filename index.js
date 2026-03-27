const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

app.get("/", (req, res) => {
  res.send("Bot is running!");
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
    const event    = entry.messaging[0];
    const senderId = event.sender.id;
    if (!event.message || !event.message.text) continue;

    const userMessage = event.message.text;
    console.log("User:", userMessage);

    try {
      const result = await model.generateContent(userMessage);
      const reply  = result.response.text();
      console.log("Bot:", reply);

      await fetch(
        https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN},
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: senderId },
            message:   { text: reply },
          }),
        }
      );
    } catch (err) {
      console.error("Error:", err.message);
    }
  }
  res.sendStatus(200);
});