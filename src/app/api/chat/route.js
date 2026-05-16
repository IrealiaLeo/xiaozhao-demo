import { NextResponse } from "next/server";
import { demoUserId } from "@/lib/mockData";
import { runAgent } from "@/lib/agents";
import { appendSessionTurn, getStore, resetStore } from "@/lib/store";
import { completeText } from "@/lib/llm";
import { streamReplyPrompt } from "@/lib/prompts";

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

export async function GET() {
  return NextResponse.json({
    userId: demoUserId,
    store: getStore()
  });
}

export async function POST(request) {
  const body = await request.json();
  if (body?.reset) {
    resetStore();
    return NextResponse.json({ ok: true, reset: true });
  }
  const query = body?.query || "";
  const userId = body?.userId || demoUserId;
  if (!query.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const result = await runAgent(query, userId, {
    personaPreset: body?.personaPreset || body?.presetId || body?.preset,
    persona: body?.persona,
    profile: body?.profile,
    profilePatch: body?.profilePatch,
    sessionMemory: body?.sessionMemory
  });
  if (result.streamMode !== "deterministic") {
    result.reply = await completeText({
      system: streamReplyPrompt,
      user: buildReplyInput(query, result),
      fallback: result.reply
    });
  }
  if (result.showCard === false) {
    result.card = null;
  }
  result.sessionMemory = appendSessionTurn(userId, {
    query,
    reply: result.reply,
    intent: result.intent,
    capability: result.capability
  });
  return NextResponse.json(result);
}
