const axios = require('axios');
const express = require("express");
const OpenAI = require("openai");

// 1. YOUR GOOGLE SHEET URL
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyr77JwuB7F5SJETqkFvtk3N8y5SFweQ6FFMTrOw4LtAFb7aGPi_VqQl0lCvWxWLz0y/exec";

// 2. FUNCTION TO SAVE DATA
async function recordOrderToSheet(name, phone, address, product, price) {
    try {
        await axios.post(GOOGLE_SHEET_URL, {
            name: name,
            phone: phone,
            address: address,
            product: product,
            totalPrice: price
        });
        console.log("✅ Order saved to Google Sheets!");
    } catch (error) {
        console.error("❌ Error saving to sheet:", error.message);
    }
}

const app = express();
app.use(express.json());

// Load keys from Render environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PAGE_ACCESS_TOKEN  = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN       = process.env.VERIFY_TOKEN;

// Initialize OpenAI/OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://render.com", 
    "X-Title": "Messenger Bot",
  }
});

app.get("/", (req, res) => res.send("Bot is active and connected to Sheets!"));

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
        const completion = await openai.chat.completions.create({
  model: "deepseek/deepseek-chat", 
  messages: [
    { 
      role: "system", 
      content: `STRICT RULES:
      1. You are 'UltraShine Sales Bot'. Your ONLY goal is to sell products.
      2. Speak ONLY in Arabic (Algerian dialect is okay).
      3. DO NOT explain what products are. DO NOT give general advice.
      4. If a user asks for 'Touchless Nitro', immediately tell them:
         'Product: Touchless Nitro 10kg. Price: 3900da + 300da delivery. Total: 4200da.'
      5. IMMEDIATELY ask for their Name, Phone, and Address.
      6. Tell them: 'الاستلام من مكتب استقبال World Express (Step Desk)'.
      7. Once you have the info, end with: DATA_TAG{"name":"...","phone":"...","address":"...","product":"...","price":"..."}DATA_TAG` 
    },
    { role: "user", content: event.message.text }
  ],
});