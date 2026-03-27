const axios = require('axios');
const express = require("express");
const OpenAI = require("openai");

// 1. Your Google Sheet URL
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyr77JwuB7F5SJETqkFvtk3N8y5SFweQ6FFMTrOw4LtAFb7aGPi_VqQl0lCvWxWLz0y/exec";

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

const app = express();
app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PAGE_ACCESS_TOKEN  = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN       = process.env.VERIFY_TOKEN;

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://render.com", 
    "X-Title": "Messenger Bot",
  }
});

app.get("/", (req, res) => res.send("Bot is active!"));

app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

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
              content: `You are a sales bot for UltraShine. Talk to the client in Arabic.
              Products:
              - Touchless nitro 10kg: 3900da (delivery 4200da)
              - Touchless nitro 10kg pink: 4200da (free delivery)
              - Dash Polish 10kg: 1200da (+ 300da delivery)
              
              Instructions:
              1. Greet and offer products.
              2. Ask for: Name, Phone, and Address.
              3. Tell them pick up is from World Express (Step Desk).
              4. ONLY when you have all info, add this tag at the end: 
              [ORDER: {"name":"...","phone":"...","address":"...","product":"...","price":"..."}]` 
            },
            { role: "user", content: event.message.text }
          ],
        });

        let replyText = completion.choices[0].message.content;

        // CHECK FOR ORDER TAG
        if (replyText.includes("[ORDER:")) {
            try {
                const orderMatch = replyText.match(/\[ORDER: (.*?)\]/);
                if (orderMatch) {
                    const order = JSON.parse(orderMatch[1]);
                    // SEND TO GOOGLE SHEET
                    await recordOrderToSheet(order.name, order.phone, order.address, order.product, order.price);
                    // CLEAN THE MESSAGE (remove the JSON tag so the user doesn't see it)
                    replyText = replyText.replace(/\[ORDER: .*?\]/, "\n\n✅ تم تسجيل طلبك بنجاح!");
                }
            } catch (e) { console.error("Parse Error", e); }
        }

        // Send to Facebook
        const fbUrl = "https://graph.facebook.com/v18.0/me/messages?access_token=" + PAGE_ACCESS_TOKEN;
        await axios.post(fbUrl, {
            recipient: { id: senderId },
            message:   { text: replyText },
        });

      } catch (err) {
        console.error("Error:", err.message);
      }
    }
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server listening on port " + PORT);
});