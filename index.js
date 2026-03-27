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
              content: `STRICT OPERATING INSTRUCTIONS:
              - Name: UltraShine Sales Bot. 
              - Language: Speak ONLY in Algerian Arabic (Darija).
              - Goal: Sell products. DO NOT give definitions or general car wash advice.
              
              PRICING & PRODUCTS:
              1. Touchless Nitro (Green): 3900da + 300da delivery = 4200da.
              2. Touchless Nitro (Pink): 4200da (Free delivery).
              3. Dash Polish: 1200da + 300da delivery.
              
              CONVERSATION FLOW:
              - Immediately offer the products and prices above.
              - Ask for: Full Name, Phone Number, and Delivery Address.
              - Tell them pickup is at: World Express (Step Desk).
              
              FINAL STEP:
              When you have all 3 pieces of info, you MUST add this hidden tag to save the data:
              DATA_TAG{"name":"...","phone":"...","address":"...","product":"...","price":"..."}DATA_TAG` 
            },
            { role: "user", content: event.message.text }
          ],
        });

        let replyText = completion.choices[0].message.content;

        // DATA EXTRACTION LOGIC
        if (replyText.includes("DATA_TAG")) {
            try {
                const jsonStr = replyText.split("DATA_TAG")[1];
                const order = JSON.parse(jsonStr);
                
                // This calls your recordOrderToSheet function at the top of the file
                await recordOrderToSheet(order.name, order.phone, order.address, order.product, order.price);
                
                replyText = replyText.split("DATA_TAG")[0] + "\n\n✅ تم تسجيل طلبك بنجاح! شكراً لك.";
            } catch (e) {
                console.error("Data Parse Error:", e);
            }
        }

        // Send to Facebook
        const fbUrl = https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN};
        await axios.post(fbUrl, {
            recipient: { id: senderId },
            message:   { text: replyText },
        });

      } catch (err) {
        console.error("Error Processing Message:", err.message);
      }
    }
  }
  res.sendStatus(200);
});