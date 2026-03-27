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
          // --- CHANGED TO GEMINI 2.0 FLASH ---
          model: "google/gemini-2.0-flash-001", 
          messages: [
            { 
              role: "system", 
              content: `STRICT MISSION: You are a salesman for 'UltraShine' car products in Algeria. 
              1. Talk ONLY in Algerian Darija (Arabic).
              2. DO NOT explain products. DO NOT mention Discord.
              3. If a user wants to buy or asks for price, say: 
                 "Touchless Nitro price is 4200da (delivery included). Please give me your Name, Phone, and City."
              4. Your ONLY goal is to collect: Name, Phone, and Address.
              5. Once you have all 3, add this hidden tag at the end: 
                 DATA_TAG{"name":"...","phone":"...","address":"...","product":"Nitro","price":"4200da"}DATA_TAG` 
            },
            { role: "user", content: event.message.text }
          ],
        });

        let replyText = completion.choices[0].message.content;

        // --- DATA COLLECTION LOGIC ---
        if (replyText.includes("DATA_TAG")) {
            try {
                const jsonStr = replyText.split("DATA_TAG")[1].split("DATA_TAG")[0];
                const order = JSON.parse(jsonStr);
                
                // This sends the data to your Google Sheet
                await recordOrderToSheet(order.name, order.phone, order.address, order.product, order.price);
                
                // Clean the message for the client
                replyText = replyText.split("DATA_TAG")[0] + "\n\n✅ تم تسجيل طلبك بنجاح! سنتصل بك قريباً.";
            } catch (e) { console.error("JSON Error", e); }
        }

        // Send to Facebook
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