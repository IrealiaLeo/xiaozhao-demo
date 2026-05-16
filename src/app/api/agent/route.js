import { NextResponse } from "next/server";
import { demoUserId } from "@/lib/mockData";
import { runAgent } from "@/lib/agents";
import { resetStore } from "@/lib/store";

export async function POST(request) {
  const body = await request.json();
  if (body?.reset) {
    resetStore();
    return NextResponse.json({ ok: true, reset: true });
  }

  const query = body?.query || body?.message || "";
  const userId = body?.userId || demoUserId;
  if (!query.trim()) {
    return NextResponse.json({ error: "query/message is required" }, { status: 400 });
  }

  const result = await runAgent(query, userId, {
    personaPreset: body?.personaPreset || body?.presetId || body?.preset,
    persona: body?.persona,
    profile: body?.profile,
    profilePatch: body?.profilePatch
  });
  return NextResponse.json(result);
}
