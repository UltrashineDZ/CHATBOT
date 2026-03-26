const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// ── Environment Variables ──────────────────────────────────────────────────
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN;

// ── Gemini Setup ───────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// ── Health Check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("✅ Messenger Bot is running!");
});

// ── Webhook Verification (Facebook requires this on setup) ─────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Facebook!");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed.");
    res.sendStatus(403);
  }
});

// ── Receive & Reply to Messages ────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  for (const entry of body.entry) {
    const event    = entry.messaging[0];
    const senderId = event.sender.id;

    // Only handle text messages
    if (!event.message || !event.message.text) continue;

    const userMessage = event.message.text;
    console.log(`📩 User (${senderId}): ${userMessage}`);

    try {
      // Send "typing on" indicator so user sees the bot is thinking
      await sendTypingOn(senderId);

      // Call Gemini AI
      const result = await model.generateContent(userMessage);
      const reply  = result.response.text();
      console.log(`🤖 Bot: ${reply}`);

      // Send reply back to Messenger
      await sendMessage(senderId, reply);

    } catch (err) {
      console.error("❌ Error:", err.message);
      await sendMessage(senderId, "Sorry, I had trouble answering that. Please try again.");
    }
  }

  res.sendStatus(200);
});

// ── Helper: Send Text Message ──────────────────────────────────────────────
async function sendMessage(recipientId, text) {
  // Messenger has a 2000 character limit per message
  const chunks = splitText(text, 1800);

  for (const chunk of chunks) {
    await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message:   { text: chunk },
        }),
      }
    );
  }
}

// ── Helper: Typing Indicator ───────────────────────────────────────────────
async function sendTypingOn(recipientId) {
  await fetch(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient:     { id: recipientId },
        sender_action: "typing_on",
      }),
    }
  );
}

// ── Helper: Split long AI replies into chunks ──────────────────────────────
function splitText(text, maxLength) {
  const chunks = [];
  while (text.length > 0) {
    chunks.push(text.substring(0, maxLength));
    text = text.substring(maxLength);
  }
  return chunks;
}

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot server running on port ${PORT}`);
});
