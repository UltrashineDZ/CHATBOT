const express = require("express");
const axios   = require("axios");

const app = express();
app.use(express.json());

// ── Environment Variables ──────────────────────────────────────────────────
const PAGE_ACCESS_TOKEN  = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN       = process.env.VERIFY_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SHEET_WEBHOOK_URL  = process.env.SHEET_WEBHOOK_URL; // Google Apps Script URL

// ── Product Price List ─────────────────────────────────────────────────────
const PRODUCTS = `
- Touchless Nitro: 4200 دج
- Touchless Classic: 3500 دج
- Engine Cleaner: 2800 دج
- Wheel Cleaner: 2200 دج
- Interior Cleaner: 1900 دج
`;

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
   DATA_TAG{"name":"الاسم","phone":"الهاتف","address":"العنوان","product":"المنتج","price":"السعر"}

قائمة الأسعار:
${PRODUCTS}`;

// ── Health Check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("✅ UltraShine Bot is running!"));

// ── Webhook Verification ───────────────────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
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
    const event    = entry.messaging[0];
    const senderId = event.sender.id;

    if (!event.message || !event.message.text) continue;

    const userMessage = event.message.text;
    console.log("📩 User:", userMessage);

    try {
      // ── Call DeepSeek via OpenRouter ─────────────────────────────────
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "deepseek/deepseek-chat",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user",   content: "اريد طلب touchless nitro" },
            { role: "assistant", content: "أهلاً بك! سعر Touchless Nitro هو 4200 دج مع التوصيل.\nعطيني من فضلك:\n1. اسمك الكامل\n2. رقم هاتفك\n3. عنوانك\n\nالتوصيل عبر World Express (Step Desk) 📦" },
            { role: "user",   content: userMessage }
          ],
        },
        {
          headers: {
            "Authorization": "Bearer " + OPENROUTER_API_KEY,
            "Content-Type":  "application/json",
            "HTTP-Referer":  "https://ultrashine.dz",
            "X-Title":       "UltraShine Bot"
          }
        }
      );

      let replyText = response.data.choices[0].message.content;
      console.log("🤖 Bot:", replyText);

      // ── Check for Order Data ─────────────────────────────────────────
      if (replyText.includes("DATA_TAG")) {
        try {
          const parts   = replyText.split("DATA_TAG");
          const jsonStr = parts[1].trim();
          const order   = JSON.parse(jsonStr);

          // Save to Google Sheets
          await saveToSheet(order);

          // Clean reply — remove the DATA_TAG part
          replyText = parts[0].trim() + "\n\n✅ تم تسجيل طلبك بنجاح! سنتواصل معك قريباً 🎉";
          console.log("📊 Order saved:", order);
        } catch (e) {
          console.error("❌ Order parse error:", e.message);
        }
      }

      // ── Send Reply to Messenger ──────────────────────────────────────
      await sendMessage(senderId, replyText);

    } catch (err) {
      console.error("❌ Error:", err.message);
      await sendMessage(senderId, "عذراً، صرا مشكل تقني. حاول مرة أخرى 🙏");
    }
  }

  res.sendStatus(200);
});

// ── Helper: Send Message to Messenger ─────────────────────────────────────
async function sendMessage(recipientId, text) {
  // Split long messages (Messenger limit 2000 chars)
  const chunks = [];
  while (text.length > 0) {
    chunks.push(text.substring(0, 1800));
    text = text.substring(1800);
  }
  for (const chunk of chunks) {
    await axios.post(
      "https://graph.facebook.com/v18.0/me/messages?access_token=" + PAGE_ACCESS_TOKEN,
      {
        recipient: { id: recipientId },
        message:   { text: chunk },
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
    name:    order.name    || "",
    phone:   order.phone   || "",
    address: order.address || "",
    product: order.product || "",
    price:   order.price   || "",
    date:    new Date().toLocaleString("fr-DZ", { timeZone: "Africa/Algiers" }),
  });
}

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 UltraShine Bot running on port " + PORT));