const axios = require("axios");
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Optional AI fallback for FAQ only
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY
});

// In-memory sessions
// NOTE: This resets on redeploy/restart. Later move this to DB/Redis/Sheets.
const sessions = new Map();

function getSession(senderId) {
  if (!sessions.has(senderId)) {
    sessions.set(senderId, {
      step: "START",
      product: "UltraShine Nitro",
      price: "4200da",
      fullName: "",
      phone: "",
      city: ""
    });
  }
  return sessions.get(senderId);
}

function resetSession(senderId) {
  sessions.set(senderId, {
    step: "START",
    product: "UltraShine Nitro",
    price: "4200da",
    fullName: "",
    phone: "",
    city: ""
  });
  return sessions.get(senderId);
}

function cleanText(text = "") {
  return text.trim();
}

function normalize(text = "") {
  return text.toLowerCase().trim();
}

function isValidPhone(phone) {
  const cleaned = phone.replace(/[^\d]/g, "");
  return cleaned.length >= 8 && cleaned.length <= 15;
}

async function callSendAPI(payload) {
  return axios.post(
    https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN},
    payload
  );
}

async function sendText(recipientId, text) {
  return callSendAPI({
    recipient: { id: recipientId },
    message: { text }
  });
}

async function sendTypingOn(recipientId) {
  return callSendAPI({
    recipient: { id: recipientId },
    sender_action: "typing_on"
  });
}

async function sendTypingOff(recipientId) {
  return callSendAPI({
    recipient: { id: recipientId },
    sender_action: "typing_off"
  });
}

async function sendQuickReplies(recipientId, text, replies) {
  return callSendAPI({
    recipient: { id: recipientId },
    message: {
      text,
      quick_replies: replies.map((r) => ({
        content_type: "text",
        title: r.title,
        payload: r.payload
      }))
    }
  });
}

async function sendButtons(recipientId, text, buttons) {
  return callSendAPI({
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons
        }
      }
    }
  });
}

async function sendWelcome(senderId) {
  resetSession(senderId);

  await sendButtons(
    senderId,
    "Salam 👋 Ana bot ta3 UltraShine. Nitro rah b 4200da. Kifach n9dar n3awnek?",
    [
      {
        type: "postback",
        title: "Ncommandi",
        payload: "ORDER_NITRO"
      },
      {
        type: "postback",
        title: "Ch7al prix?",
        payload: "ASK_PRICE"
      },
      {
        type: "postback",
        title: "Livraison",
        payload: "ASK_DELIVERY"
      }
    ]
  );
}

async function sendOrderSummary(senderId, session) {
  await sendButtons(
    senderId,
    Tmam ✅ hada recap ta3 talabek:\n\nProduit: ${session.product}\nPrix: ${session.price}\nSmiya: ${session.fullName}\nTel: ${session.phone}\nVille: ${session.city}\n\nGhadi ntwaslo bik قريب.,
    [
      {
        type: "postback",
        title: "N3awed commande",
        payload: "RESTART_ORDER"
      },
      {
        type: "postback",
        title: "Prix / Infos",
        payload: "ASK_PRICE"
      }
    ]
  );
}

async function handlePostback(senderId, payload) {
  const session = getSession(senderId);

  switch (payload) {
    case "GET_STARTED":
      return sendWelcome(senderId);

    case "ORDER_NITRO":
      session.step = "ASK_NAME";
      return sendText(
        senderId,
        "Mli7 ✅ UltraShine Nitro b 4200da. 3tini smitek kamla bach nsajlo talab."
      );

    case "ASK_PRICE":
      return sendQuickReplies(
        senderId,
        "UltraShine Nitro rah b 4200da ✅ Ila hab tcommandi, ikhtar wahda:",
        [
          { title: "Ncommandi", payload: "ORDER_NITRO" },
          { title: "Livraison", payload: "ASK_DELIVERY" }
        ]
      );

    case "ASK_DELIVERY":
      return sendQuickReplies(
        senderId,
        "Livraison disponible 58 wilaya. Ila hab tcommandi, نبداو بالمعلومات ta3ek.",
        [
          { title: "Ncommandi", payload: "ORDER_NITRO" },
          { title: "Rani mazal", payload: "BACK_HOME" }
        ]
      );

    case "BACK_HOME":
      return sendWelcome(senderId);

    case "RESTART_ORDER":
      return sendWelcome(senderId);

    default:
      return sendText(
        senderId,
        "Ma fhemtch had l'action. Klik 3la menu wela kteb: ncommandi."
      );
  }
}

async function handleFAQWithAI(senderId, userText) {
  if (!OPENROUTER_API_KEY) {
    return sendQuickReplies(
      senderId,
      "Ana n9dar n3awnek ghir b commande ta3 UltraShine Nitro. Chnoua hab dir?",
      [
        { title: "Ncommandi", payload: "ORDER_NITRO" },
        { title: "Ch7al prix?", payload: "ASK_PRICE" }
      ]
    );
  }

  try {
    await sendTypingOn(senderId);

    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content:
            "You are a sales assistant for UltraShine. Speak only Algerian Darija. Keep replies short. Product: UltraShine Nitro. Price: 4200da. Your goal is to move the user toward ordering. If the question is not related to buying, price, delivery, or the product, redirect politely to the order flow. Never act like a general assistant."
        },
        {
          role: "user",
          content: userText
        }
      ]
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    await sendTypingOff(senderId);

    if (reply) {
      return sendQuickReplies(senderId, reply, [
        { title: "Ncommandi", payload: "ORDER_NITRO" },
        { title: "Prix", payload: "ASK_PRICE" }
      ]);
    }

    return sendText(senderId, "Ktebli: ncommandi");
  } catch (error) {
    await sendTypingOff(senderId);
    console.error("AI fallback error:", error.response?.data || error.message);
    return sendQuickReplies(
      senderId,
      "Ana n9dar n3awnek f commande ta3 Nitro bark. Chnoua hab dir?",
      [
        { title: "Ncommandi", payload: "ORDER_NITRO" },
        { title: "Prix", payload: "ASK_PRICE" }
      ]
    );
  }
}

async function handleText(senderId, text) {
  const session = getSession(senderId);
  const msg = cleanText(text);
  const lower = normalize(msg);

  // Trigger order flow from common keywords
  if (
    ["nitro", "prix", "price", "commande", "order", "ncommandi", "buy"].some((k) =>
      lower.includes(k)
    ) &&
    session.step === "START"
  ) {
    return handlePostback(senderId, "ORDER_NITRO");
  }

  switch (session.step) {
    case "START":
      return sendWelcome(senderId);

    case "ASK_NAME":
      session.fullName = msg;
      session.step = "ASK_PHONE";
      return sendText(senderId, "Top 👍 daba 3tini رقم الهاتف ta3ek:");

    case "ASK_PHONE":
      if (!isValidPhone(msg)) {
        return sendText(
          senderId,
          "رقم الهاتف ma ybanlich s7i7. 3awed ktebo mli7, exemple: 0550123456"
        );
      }
      session.phone = msg;
      session.step = "ASK_CITY";
      return sendText(
        senderId,
        "Mli7 ✅ daba 3tini lولاية wela المدينة ta3 livraison:"
      );

    case "ASK_CITY":
      session.city = msg;
      session.step = "CONFIRMED";

      // TODO: save to DB / Google Sheets / Airtable / Supabase here
      console.log("NEW ORDER:", {
        senderId,
        product: session.product,
        price: session.price,
        fullName: session.fullName,
        phone: session.phone,
        city: session.city,
        createdAt: new Date().toISOString()
      });

      return sendOrderSummary(senderId, session);

    case "CONFIRMED":
      return sendQuickReplies(
        senderId,
        "Talabek déjà tsajel ✅ Ila hab t3awed wela ts9si 3la prix, ikhtar:",
        [
          { title: "N3awed commande", payload: "RESTART_ORDER" },
          { title: "Prix", payload: "ASK_PRICE" }
        ]
      );

    default:
      return handleFAQWithAI(senderId, msg);
  }
}

// Health route for Render
app.get("/", (req, res) => {
  res.status(200).send("Bot is Online");
});

// Facebook webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Messenger webhook
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  // Acknowledge first
  res.sendStatus(200);

  try {
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        if (!senderId) continue;

        if (event.postback?.payload) {
          await handlePostback(senderId, event.postback.payload);
          continue;
        }

        if (event.message?.quick_reply?.payload) {
          await handlePostback(senderId, event.message.quick_reply.payload);
          continue;
        }

        if (event.message?.text) {
          await handleText(senderId, event.message.text);
          continue;
        }
      }
    }
  } catch (error) {
    console.error("Webhook error:", error.response?.data || error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(Server running on port ${PORT});
});

