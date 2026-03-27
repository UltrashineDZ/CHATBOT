

const axios = require('axios');

// 1. Replace with the URL you copied from Google Apps Script
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyr77JwuB7F5SJETqkFvtk3N8y5SFweQ6FFMTrOw4LtAFb7aGPi_VqQl0lCvWxWLz0y/exec";

// 2. This function sends the data to your sheet
async function recordOrderToSheet(name, phone, address, product, price) {
    try {
        await axios.post(GOOGLE_SHEET_URL, {
            name: name,
            phone: phone,
            address: address,
            product: product,
            totalPrice: price
        });
        console.log("Order saved to Google Sheets!");
    } catch (error) {
        console.error("Error saving to sheet:", error);
    }
}
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// Load your keys from Render environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PAGE_ACCESS_TOKEN  = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN       = process.env.VERIFY_TOKEN;

// 1. Initialize OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://render.com", 
    "X-Title": "Messenger Bot",
  }
});

app.get("/", (req, res) => res.send("Bot is active on OpenRouter!"));

// Webhook Verification
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
        // 2. Use a Free Model (No Gemini Key needed)
        const completion = await openai.chat.completions.create({
          model: "deepseek/deepseek-chat", // Or use "meta-llama/llama-3.3-70b-instruct"
          messages: [{ role: "user", content: event.message.text }],
        });

        const replyText = completion.choices[0].message.content;

        // 3. Send response to Facebook
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

// 4. Correct Port Binding for Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server successfully listening on port " + PORT);
});