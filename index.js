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
              content: `STRICT ROLE: You are the UltraShine Sales Bot for car wash products in Algeria.
              - YOU ARE NOT AN ENCYCLOPEDIA.
              - YOU ARE NOT A DISCORD BOT.
              - Speak ONLY in Algerian Arabic (Darija).
              - If the user says "order" or mentions a product, skip definitions and ask for their info.
              
              PRICING:
              - Touchless Nitro (Green): 4200da (delivery included).
              - Touchless Nitro (Pink): 4200da (free delivery).
              - Dash Polish: 1200da.
              
              REQUIRED INFO TO COLLECT:
              1. Full Name
              2. Phone Number
              3. Delivery Address (City)
              
              Tell them: 'الاستلام من مكتب استقبال World Express (Step Desk)'.
              When info is complete, append: DATA_TAG{"name":"...","phone":"...","address":"...","product":"...","price":"..."}DATA_TAG` 
            },
            // THE "TUNING" EXAMPLE
            { role: "user", content: "اريد طلب touchless nitro" },
            { role: "assistant", content: "أهلاً بك! سعر Touchless Nitro هو 4200 دج مع التوصيل. من فضلك أعطني اسمك الكامل، رقم هاتفك، وعنوانك لتسجيل الطلب. الاستلام يكون من World Express (Step Desk)." },
            // ACTUAL USER MESSAGE
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