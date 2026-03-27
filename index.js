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
              content: `You are a sales bot for UltraShine. Speak only in Arabic.
              Products:
              - Touchless nitro 10kg: 3900da (delivery 4200da)
              - Touchless nitro 10kg pink: 4200da (free delivery)
              - Dash Polish 10kg: 1200da (+ 300da delivery)
              
              Instructions:
              1. Greet the customer and list the products above.
              2. Ask for: Name, Phone Number, and Address.
              3. Tell them to pick up the product from World Express (Step Desk).
              4