cconst express = require("express");
const { GoogleGenAI } = require("@google/genai"); // Updated import

const app = express();
app.use(express.json());

// ── Environment Variables ──────────────────────────────────────────────────
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN;

// ── Gemini Setup (Updated for latest SDK) ──────────────────────────────────
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ── Health Check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("✅ Messenger Bot is running with latest SDK!");
});

// ... rest of your code (webhook verification and messaging) ...

// Inside your message handler (app.post("/webhook")), 
// change the generation call to this:
async function getGeminiResponse(userText) {
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash", 
    contents: [{ role: 'user', parts: [{ text: userText }] }]
  });
  return result.response.text();
}


