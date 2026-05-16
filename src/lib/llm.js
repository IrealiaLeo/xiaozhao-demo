import OpenAI from "openai";

const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7-highspeed";
const baseURL = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";
const llmTimeoutMs = Number(process.env.MINIMAX_TIMEOUT_MS || 45000);

export function hasLLM() {
  return Boolean(process.env.MINIMAX_API_KEY);
}

function getClient() {
  return new OpenAI({
    apiKey: process.env.MINIMAX_API_KEY,
    baseURL
  });
}

export function extractJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function completeJson({ system, user, fallback }) {
  if (!hasLLM()) return fallback;

  try {
    const client = getClient();
    const response = await Promise.race([
      client.chat.completions.create({
        model,
        temperature: 1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        extra_body: { reasoning_split: true }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`MiniMax timeout after ${llmTimeoutMs}ms`)), llmTimeoutMs)
      )
    ]);

    const parsed = extractJson(response.choices?.[0]?.message?.content);
    return parsed || fallback;
  } catch (error) {
    console.error("MiniMax call failed", error?.message || error);
    return fallback;
  }
}

export async function* streamText({ system, user, signal }) {
  if (!hasLLM()) return;

  const client = getClient();
  const stream = await client.chat.completions.create(
    {
      model,
      temperature: 1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      extra_body: { reasoning_split: true },
      stream: true
    },
    signal ? { signal } : undefined
  );

  let textBuffer = "";
  let filterBuffer = "";
  let inThinkBlock = false;
  const thinkStart = "<think>";
  const thinkEnd = "</think>";

  function heldPrefixLength(text, marker) {
    const max = Math.min(text.length, marker.length - 1);
    for (let size = max; size > 0; size -= 1) {
      if (marker.startsWith(text.slice(-size))) return size;
    }
    return 0;
  }

  function drainVisible(text) {
    filterBuffer += text;
    let visible = "";

    while (filterBuffer) {
      if (inThinkBlock) {
        const end = filterBuffer.indexOf(thinkEnd);
        if (end === -1) {
          filterBuffer = filterBuffer.slice(-thinkEnd.length);
          break;
        }
        filterBuffer = filterBuffer.slice(end + thinkEnd.length);
        inThinkBlock = false;
        continue;
      }

      const start = filterBuffer.indexOf(thinkStart);
      if (start === -1) {
        const keep = heldPrefixLength(filterBuffer, thinkStart);
        visible += filterBuffer.slice(0, filterBuffer.length - keep);
        filterBuffer = filterBuffer.slice(filterBuffer.length - keep);
        break;
      }

      visible += filterBuffer.slice(0, start);
      filterBuffer = filterBuffer.slice(start + thinkStart.length);
      inThinkBlock = true;
    }

    return visible;
  }

  for await (const chunk of stream) {
    const contentText = chunk.choices?.[0]?.delta?.content;
    if (!contentText) continue;

    const nextText = contentText.startsWith(textBuffer)
      ? contentText.slice(textBuffer.length)
      : contentText;
    if (nextText) {
      textBuffer = contentText.startsWith(textBuffer) ? contentText : textBuffer + nextText;
      const visible = drainVisible(nextText);
      if (visible) yield visible;
    }
  }
}

export async function completeText({ system, user, fallback }) {
  if (!hasLLM()) return fallback;

  try {
    const client = getClient();
    const response = await Promise.race([
      client.chat.completions.create({
        model,
        temperature: 1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        extra_body: { reasoning_split: true }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`MiniMax timeout after ${llmTimeoutMs}ms`)), llmTimeoutMs)
      )
    ]);

    const text = response.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return text || fallback;
  } catch (error) {
    console.error("MiniMax text call failed", error?.message || error);
    return fallback;
  }
}
