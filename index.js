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
              content: `You are UltraShine Sales Bot. 
              RULES:
              1. Speak ONLY in Algerian Arabic.
              2. DO NOT explain products.
              3. ONLY offer prices and ask for: Name, Phone, and Address.
              4. Pickup: World Express (Step Desk).`
            },
            // THE EXAMPLE (Force the AI to follow this style)
            { role: "user", content: "اريد طلب touchless nitro" },
            { role: "assistant", content: "أهلاً بك! سعر Touchless Nitro هو 4200 دج مع التوصيل. من فضلك أعطني اسمك الكامل، رقم هاتفك، وعنوانك لتسجيل الطلب. الاستلام من World Express (Step Desk)." },
            // THE ACTUAL USER MESSAGE
            { role: "user", content: event.message.text }
          ],
        });

        let replyText = completion.choices[0].message.content;

        // Automatically prepare the hidden DATA_TAG if it seems the AI forgot it
        // but has provided a confirmation style message
        if (replyText.includes("اسم") || replyText.includes("رقم")) {
             // Logic to stay in "Gathering Mode"
        }

        // Logic to extract DATA_TAG and save to sheet
        if (replyText.includes("DATA_TAG")) {
            try {
                const jsonStr = replyText.split("DATA_TAG")[1];
                const order = JSON.parse(jsonStr);
                await recordOrderToSheet(order.name, order.phone, order.address, order.product, order.price);
                replyText = replyText.split("DATA_TAG")[0] + "\n\n✅ تم تسجيل طلبك بنجاح!";
            } catch (e) { console.error("JSON Error", e); }
        }

        // Send to Facebook
        const fbUrl = https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN};
        await axios.post(fbUrl, {
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