const axios = require('axios');
const express = require("express");
const OpenAI = require("openai");

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyr77JwuB7F5SJETqkFvtk3N8y5SFweQ6FFMTrOw4LtAFb7aGPi_VqQl0lCvWxWLz0y/exec";

async function recordOrderToSheet(name, phone, address, product, price) {
    try {
        await axios.post(GOOGLE_SHEET_URL, { name, phone, address, product, totalPrice: price });
        console.log("✅ Saved to Sheets");
    } catch (e) { console.error("❌ Sheet Error", e.message); }
}

const app = express();
app.use(express.json());

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY
});

app.get("/", (req, res) => res.send("Bot is Live"));

app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === process.env.VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else { res.sendStatus(403); }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        try {
          const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [
              { role: "system", content: "You are an Algerian Sales Bot. Speak ONLY Algerian Darija. Products: Nitro (4200da). Goal: Collect Name, Phone, and City. NO general info. Tell them pickup at World Express (Step Desk)." },
              { role: "user", content: event.message.text }
            ]
          });

          const replyText = completion.choices[0].message.content;

          await axios.post(https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}, {
            recipient: { id: senderId },
            message: { text: replyText }
          });
        } catch (err) { console.error("FB Error", err.message); }
      }
    }
    res.sendStatus(200);
  }
});

app.listen(process.env.PORT || 10000);

