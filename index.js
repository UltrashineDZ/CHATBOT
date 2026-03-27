const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ── Environment Variables ──────────────────────────────────────────────────
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SHEET_WEBHOOK_URL = process.env.SHEET_WEBHOOK_URL; // Google Apps Script URL

// ── Product Price List ─────────────────────────────────────────────────────
const PRODUCTS = {
  "touchless nitro": { price: "4200 دج" },
  "touchless classic": { price: "3500 دج" },
  "engine cleaner": { price: "2800 دج" },
  "wheel cleaner": { price: "2200 دج" },
  "interior cleaner": { price: "1900 دج" },
};

// ── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `أنت بوت مبيعات UltraShine DZ.
قواعد صارمة جداً:
1. تكلم فقط بالعربية الجزائرية الدارجة.
2. ممنوع تماماً شرح أي منتج.
3. ممنوع استخدام ### أو ** أو * أو أي رموز markdown.
4. فقط أعطي السعر مباشرة واطلب: الاسم، الهاتف، العنوان.
5. ردودك قصيرة ومباشرة — جملتين فقط.
6. التوصيل عبر World Express (Step Desk).
7. بعد جمع الاسم والهاتف والعنوان، أكد الطلب وأضف:
   DATA_TAG{"name":"الاسم","phone":"الهاتف","address":"العنوان","product":"المنتج","price":"السعر"}`;

// ── Health Check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("✅ UltraShine Bot is running!"));

// ── Webhook Verification ───────────────────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ── Receive Messages ───────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);

  for (const entry of body.entry) {
    if (!entry.messaging) continue;
    const event = entry.messaging[0];
    const senderId = event.sender.id;

    if (!event.message || !event.message.text) continue;

    const userMessage = event.message.text.toLowerCase();
    console.log("📩 User:", userMessage);

    try {
      // Check for product inquiries
      for (const product in PRODUCTS) {
        if (userMessage.includes(product)) {
          const price = PRODUCTS[product].price;
          await sendMessage(senderId, `سعر ${product} هو ${price} مع التوصيل. عطيني من فضلك:\n1. اسمك الكامل\n2. رقم هاتفك\n3. عنوانك\n\nالتوصيل عبر World Express (Step Desk) 📦`);
          return;
        }
      }

      // Fallback if no specific product is mentioned
      await sendMessage(senderId, "عذراً، ما فهمتش الطلب. وش تحب تطلب؟");

    } catch (err) {
      console.error("❌ Error:", err.message);
      await sendMessage(senderId, "عذراً، صرا مشكل تقني. حاول مرة أخرى 🙏");
    }
  }

  res.sendStatus(200);
});

// ── Helper: Send Message to Messenger ──────────────────────────────────────
async function sendMessage(recipientId, text) {
  const chunks = [];
  while (text.length > 0) {
    let chunk = text.substring(0, 1800);
    let lastSpaceIndex = chunk.lastIndexOf(' ');

    if (lastSpaceIndex === -1) {
      lastSpaceIndex = 1800; // or whatever your limit is
    }

    chunks.push(text.substring(0, lastSpaceIndex));
    text = text.substring(lastSpaceIndex).trim();
  }
  
  for (const chunk of chunks) {
    await axios.post(
      "https://graph.facebook.com/v18.0/me/messages?access_token=" + PAGE_ACCESS_TOKEN,
      {
        recipient: { id: recipientId },
        message: { text: chunk },
      }
    );
  }
}

// ── Helper: Save Order to Google Sheets ───────────────────────────────────
async function saveToSheet(order) {
  if (!SHEET_WEBHOOK_URL) {
    console.log("⚠️  SHEET_WEBHOOK_URL not set, skipping sheet save");
    return;
  }
  await axios.post(SHEET_WEBHOOK_URL, {
    name: order.name || "",
    phone: order.phone || "",
    address: order.address || "",
    product: order.product || "",
    price: order.price || "",
    date: new Date().toLocaleString("fr-DZ", { timeZone: "Africa/Algiers" }),
  });
}

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 UltraShine Bot running on port " + PORT));