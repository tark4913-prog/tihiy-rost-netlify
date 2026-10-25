// Netlify Function: защищённый прокси к Yandex AI Studio (Alice AI LLM Flash).
const MAX_MESSAGE_CHARS = 9000;
const MAX_MESSAGES = 10;
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};
const json = (statusCode, payload) => ({
  statusCode,
  headers: HEADERS,
  body: JSON.stringify(payload)
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { ...json(405, { error: "Метод не поддерживается. Используйте POST." }), headers: { ...HEADERS, Allow: "POST" } };
  }
  if (event.body && event.body.length > 20000) {
    return json(413, { error: "Сообщение слишком большое. Сократите текст и попробуйте снова." });
  }

  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) {
    return json(503, { error: "ИИ пока не настроен. Администратору нужно добавить YANDEX_API_KEY и YANDEX_FOLDER_ID в переменные Netlify." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Не удалось прочитать запрос. Попробуйте отправить вопрос ещё раз." }); }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, { error: "Введите вопрос." });
  }
  const messages = body.messages.slice(-MAX_MESSAGES);
  const cleanMessages = [];
  for (const message of messages) {
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string") continue;
    const content = message.content.trim();
    if (!content) continue;
    if (content.length > MAX_MESSAGE_CHARS) {
      return json(413, { error: `Одно сообщение не должно превышать ${MAX_MESSAGE_CHARS} символов.` });
    }
    cleanMessages.push({ role: message.role, content });
  }
  if (!cleanMessages.length || cleanMessages[cleanMessages.length - 1].role !== "user") {
    return json(400, { error: "Последним сообщением должен быть ваш вопрос." });
  }

  const systemPrompt = 
const systemPrompt = `Ты — вежливый консультант сайта «Тихий рост». Отвечай только на русском языке. Пиши понятно, дружелюбно и по делу. Давай ответы длиной от 2 до 9 предложений в зависимости от сложности вопроса. Обычно достаточно 4–6 предложений, максимум 9. Не повторяй один и тот же совет несколько раз. Используй короткие абзацы и списки, если это помогает. Консультируй по уходу за саженцами дуба, кипариса аризонского и лиственницы: посадка, полив, сезонный уход, зимовка и температуры выращивания. Не выдумывай точные характеристики сорта, морозостойкость, наличие, гарантии, цену или условия продажи, если они неизвестны. Если для точного ответа важны регион, вид или сорт растения либо выращивание в горшке или открытом грунте, уточни это. Не представляй примерные температурные значения как гарантию. По вопросам заказа на Ozon, доставки, возврата, повреждения товара, оплаты или спора направляй покупателя в чат соответствующего заказа на Ozon. Если не уверен, честно скажи об этом и предложи уточнить данные у продавца или местного специалиста по растениям.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("https://ai.api.cloud.yandex.net/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Api-Key ${apiKey}`,
        "OpenAI-Project": folderId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: `gpt://${folderId}/aliceai-llm-flash`,
        messages: [{ role: "system", content: systemPrompt }, ...cleanMessages],
        temperature: 0.3,
        max_tokens: 700,
        stream: false
      }),
      signal: controller.signal
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      // Не записываем ключ или полное тело запроса в логи.
      console.error("Yandex AI API returned HTTP", response.status);
      if (response.status === 401 || response.status === 403) {
        return json(502, { error: "Не удалось авторизоваться в Yandex AI Studio. Проверьте API-ключ и права сервисного аккаунта." });
      }
      if (response.status === 429) {
        return json(503, { error: "Сервис ИИ временно перегружен или исчерпан лимит запросов. Попробуйте позже." });
      }
      return json(502, { error: "Yandex AI Studio временно не смог обработать вопрос. Попробуйте позже." });
    }
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return json(502, { error: "Модель вернула пустой ответ. Попробуйте переформулировать вопрос." });
    }
    return json(200, { reply: reply.trim() });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return json(504, { error: "Ответ задерживается. Попробуйте ещё раз немного позже." });
    }
    console.error("Yandex AI request failed:", error && error.message ? error.message : "unknown error");
    return json(502, { error: "Не удалось связаться с сервисом ИИ. Проверьте соединение и попробуйте позже." });
  } finally {
    clearTimeout(timeout);
  }
};
