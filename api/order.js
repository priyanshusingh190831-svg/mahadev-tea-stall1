export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({
      ok: false,
      error: "Telegram notifications are not configured."
    });
  }

  try {
    const order = req.body;

    if (
      !order ||
      !order.customer ||
      !order.phone ||
      !Array.isArray(order.items) ||
      !order.items.length
    ) {
      return res.status(400).json({
        ok: false,
        error: "Name, phone and at least one item are required."
      });
    }

    const safe = value =>
      String(value || "—").replace(/[<>]/g, "").slice(0, 500);

    const lines = [
      "🛎️ NEW MAHADEV TEA STALL ORDER",
      "",
      `👤 Name: ${safe(order.customer)}`,
      `📞 Phone: ${safe(order.phone)}`,
      `🛍️ Order type: ${safe(order.fulfilment)}`,
      `📍 Address: ${safe(order.address)}`,
      "",
      "ITEMS:"
    ];

    let total = 0;

    for (const item of order.items.slice(0, 30)) {
      const qty = Math.max(1, Math.min(99, Number(item.quantity) || 1));
      const price = Math.max(0, Math.min(100000, Number(item.price) || 0));

      total += qty * price;
      lines.push(`• ${safe(item.name)} × ${qty} — ₹${qty * price}`);
    }

    lines.push(
      "",
      `💰 Total: ₹${total}`,
      `📝 Notes: ${safe(order.notes)}`,
      "",
      "Please contact the customer to confirm this order."
    );

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join("\n")
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("Telegram notification failed:", {
        httpStatus: response.status,
        errorCode: result.error_code || null,
        description: result.description || "No description returned"
      });

      return res.status(502).json({
        ok: false,
        error: "Telegram could not accept the notification."
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Order handler error:", error);

    return res.status(400).json({
      ok: false,
      error: "Invalid order details."
    });
  }
}
