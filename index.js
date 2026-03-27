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
  model: "google/gemini-2.0-flash-001", // or "google/gemini-2.0-flash-001"
  messages: [
    { 
      role: "system", 
      content: `STRICT ROLE: You are the UltraShine Sales Bot for car wash products in Algeria.
      - LANGUAGE: Speak ONLY in Algerian Darija (Arabic).
      - NO DEFINITIONS: If a user asks for a product, DO NOT explain what it is. 
      - MISSION: Your only goal is to get: Full Name, Phone, and Address.
      
      PRICES:
      - Touchless Nitro (Green): 4200da (delivery included).
      - Touchless Nitro (Pink): 4200da (free delivery).
      - Dash Polish: 1200da.
      
      STEPS:
      1. Greet and show prices.
      2. Ask for the Name, Phone, and City.
      3. Tell them: 'الاستلام من مكتب استقبال World Express (Step Desk)'.
      
      When info is complete, append: DATA_TAG{"name":"...","phone":"...","address":"...","product":"...","price":"..."}DATA_TAG` 
    },
    // FAKE EXAMPLE TO TRAIN THE BOT
    { role: "user", content: "اريد طلب touchless nitro" },
    { role: "assistant", content: "أهلاً بك! سعر Touchless Nitro هو 4200 دج مع التوصيل. من فضلك أعطني اسمك الكامل، رقم هاتفك، وعنوانك (الولاية) لتسجيل الطلب. الاستلام يكون من World Express (Step Desk)." },
    
    // THE REAL MESSAGE FROM YOUR CLIENT
    { role: "user", content: event.message.text }
  ],
});

        let replyText = completion.choices[0].message.content;

        // SHEET LOGIC
        if (replyText.includes("DATA_TAG")) {
            try {
                const jsonStr = replyText.split("DATA_TAG")[1].split("DATA_TAG")[0];
                const order = JSON.parse(jsonStr);
                await recordOrderToSheet(order.name, order.phone, order.address, order.product, order.price);
                replyText = replyText.split("DATA_TAG")[0] + "\n\n✅ تم تسجيل طلبك بنجاح!";
            } catch (e) { console.error("JSON Error", e); }
        }

        // Send to Facebook using Axios
        await axios.post(https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}, {
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