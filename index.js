const axios = require('axios');
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// إعداد OpenAI للعمل مع OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY
});

// صفحة تأكيد اشتغال السيرفر
app.get("/", (req, res) => res.send("UltraShine Bot is Live and Fixed!"));

// التحقق من Webhook الخاص بـ Meta
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// استقبال الرسائل ومعالجتها
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      if (!entry.messaging) continue;
      
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        const userMessage = event.message.text;

        try {
          // 1. إظهار مؤشر "يكتب الآن..." لزيادة التفاعل
          await axios.post(https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}, {
            recipient: { id: senderId },
            sender_action: "typing_on"
          });

          // 2. طلب الرد من Gemini عبر OpenRouter
          const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [
              { 
                role: "system", 
                content: "أنت بائع في محل UltraShine. تحدث فقط بالدارجة الجزائرية بأسلوب محترم. لا تشرح المنتجات بالتفصيل. اطلب من الزبون فقط: الاسم، رقم الهاتف، والولاية لإتمام الطلب." 
              },
              { role: "user", content: userMessage }
            ]
          });

          const replyText = completion.choices[0].message.content;

          // 3. إرسال الرد للزبون
          await axios.post(https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}, {
            recipient: { id: senderId },
            message: { text: replyText }
          });

        } catch (err) {
          console.error("Error Processing Message:", err.response ? err.response.data : err.message);
        }
      }
    }
    // إعلام Meta بأننا استلمنا الطلب بنجاح
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// إعداد المنفذ (Port) الخاص بـ Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(Server is running on port ${PORT});
});
23:47
Vous avez envoyé
const axios = require('axios');
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY
});

app.get("/", (req, res) => res.send("UltraShine Sales Bot is Active!"));

app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === process.env.VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "page") {
    // إرسال رد سريع لفيسبوك لتجنب التكرار (Important for Render Free Tier)
    res.sendStatus(200);

    for (const entry of body.entry) {
      if (!entry.messaging) continue;
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        try {
          // مؤشر الكتابة
          await axios.post(https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}, {
            recipient: { id: senderId },
            sender_action: "typing_on"
          });

          const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [
              { 
                role: "system", 
                content: `أنت بائع حصري في محل UltraShine لمنتجات العناية بالسيارات في الجزائر.
                التعليمات الصارمة:
                1. تكلم فقط وفقط بالدارجة الجزائرية (تاع المحلات والبيع). ممنوع العربية الفصحى.
                2. لا تشرح المنتجات تقنياً، ركز على البيع.
                3. هدفك الوحيد: جمع (الاسم الكامل، رقم الهاتف، والولاية).
                4. الأسعار ثابتة: Nitro بـ 4200 دج، و Dash Polish بـ 1200 دج.
                5. التوصيل/الاستلام: عبر World Express (Step Desk).
                6. إذا العميل سألك سؤال عام، جاوبه بذكاء وارجع اطلب المعلومات.` 
              },
              // مثال ليتعلم البوت النبرة (Few-shot)
              { role: "user", content: "سلام خويا، شحال السعر وكيفاش نشري؟" },
              { role: "assistant", content: "أهلا بيك خويا العزيز! عندنا الـ Nitro بـ 4200 دج والـ Dash بـ 1200 دج. باش نسجلو الطلبية ونبعتولك لـ World Express، أعطينا اسمك الكامل، رقم التليفون، والولاية ديالك برك." },
              // رسالة الزبون الحقيقية
              { role: "user", content: event.message.text }
            ],
            temperature: 0.4, // لجعل الإجابات محددة وغير عشوائية
            max_tokens: 200
          });

          const replyText = completion.choices[0].message.content;

          await axios.post(https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}, {
            recipient: { id: senderId },
            message: { text: replyText }
          });

        } catch (err) {
          console.error("Bot Error:", err.response ? err.response.data : err.message);
        }
      }
    }
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(Server running on ${PORT}));

