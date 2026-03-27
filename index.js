const axios = require('axios');
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY
});

app.get("/", (req, res) => res.send("Bot is Live and Fixed!"));

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
    for (const entry of body.entry) {
      if (!entry.messaging) continue;
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        try {
          const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [
              { 
                role: "system", 
                content: "أنت بائع في محل UltraShine. تحدث فقط بالدارجة الجزائرية. لا تشرح المنتجات. اطلب فقط: الاسم، رقم الهاتف، والولاية." 
              },
              { role: "user", content: event.message.text }
            ]
          });

          const replyText = completion.choices[0].message.content;

          // FIXED AXIOS CALL - NO MORE SYNTAX ERRORS
          await axios.post(https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}, {
            recipient: { id: senderId },
            message: { text: replyText }
          });

        } catch (err) {
          console.error("Error details:", err.message);
        }
      }
    }
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(Server running on ${PORT}));

