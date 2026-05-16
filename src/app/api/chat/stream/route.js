import { demoUserId } from "@/lib/mockData";
import { runAgent } from "@/lib/agents";
import { streamText } from "@/lib/llm";
import { streamReplyPrompt } from "@/lib/prompts";
import { appendSessionTurn } from "@/lib/store";

function sse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function splitText(text) {
  const parts = [];
  for (let index = 0; index < text.length; index += 8) {
    parts.push(text.slice(index, index + 8));
  }
  return parts;
}

function buildReplyInput(query, result) {
  return JSON.stringify(
    {
      query,
      intent: result.intent,
      capability: result.capabilityName,
      persona: result.snapshot?.profile,
      sessionMemory: result.sessionMemory,
      card: result.card,
      factsDraft: result.reply
    },
    null,
    2
  );
}

async function streamDraftReply({ push, result }) {
  let streamedReply = "";
  for (const delta of splitText(result.reply || "")) {
    streamedReply += delta;
    push("delta", { text: delta });
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
  return streamedReply;
}

export async function POST(request) {
  const body = await request.json();
  const query = body?.query || body?.message || "";
  const userId = body?.userId || demoUserId;

  if (!query.trim()) {
    return new Response(sse("error", { error: "query/message is required" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" }
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const push = (event, data) => controller.enqueue(encoder.encode(sse(event, data)));
      let result = null;
      let streamedReply = "";
      try {
        push("status", { message: "小招正在思考中..." });
        result = await runAgent(query, userId, {
          personaPreset: body?.personaPreset || body?.presetId || body?.preset,
          persona: body?.persona,
          profile: body?.profile,
          profilePatch: body?.profilePatch,
          sessionMemory: body?.sessionMemory
        });
        push("route", {
          intent: result.intent,
          capability: result.capability,
          capabilityName: result.capabilityName,
          confidence: result.route?.confidence
        });

        if (result.streamMode === "deterministic") {
          streamedReply = await streamDraftReply({ push, result });
        } else {
          try {
            for await (const delta of streamText({
              system: streamReplyPrompt,
              user: buildReplyInput(query, result),
              signal: request.signal
            })) {
              streamedReply += delta;
              push("delta", { text: delta });
            }
          } catch (error) {
            console.error("MiniMax stream failed", error?.message || error);
          }
        }

        if (!streamedReply.trim()) {
          streamedReply = await streamDraftReply({ push, result });
        }

        const finalResult = { ...result, reply: streamedReply.trim() || result.reply };
        const updatedSessionMemory = appendSessionTurn(userId, {
          query,
          reply: finalResult.reply,
          intent: finalResult.intent,
          capability: finalResult.capability
        });
        finalResult.sessionMemory = updatedSessionMemory;
        push("card", { card: finalResult.showCard === false ? null : finalResult.card, cards: finalResult.cards || [] });
        push("actions", { actions: finalResult.actions || [] });
        push("snapshot", { snapshot: finalResult.snapshot });
        push("done", { ...finalResult, card: finalResult.showCard === false ? null : finalResult.card });
      } catch (error) {
        push("error", { error: error?.message || "stream failed" });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
