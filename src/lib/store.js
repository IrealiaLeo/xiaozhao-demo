import {
  demoPersonaFixtures,
  demoUserId,
  emptyProfile,
  initialStore
} from "./mockData";

const globalKey = "__xiaozhao_demo_store__";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function now() {
  return new Date().toISOString();
}

export function getStore() {
  if (!globalThis[globalKey]) {
    globalThis[globalKey] = clone(initialStore);
  }
  return globalThis[globalKey];
}

export function resetStore() {
  globalThis[globalKey] = clone(initialStore);
  return globalThis[globalKey];
}

export function getUser(userId = demoUserId) {
  const store = getStore();
  if (!store.users[userId]) {
    store.users[userId] = {
      id: userId,
      name: "同学",
      profile: clone(emptyProfile)
    };
  }
  return store.users[userId];
}

export function getSessionMemory(userId = demoUserId) {
  getUser(userId);
  const store = getStore();
  store.sessionMemories = store.sessionMemories || {};
  if (!store.sessionMemories[userId]) {
    store.sessionMemories[userId] = {
      userId,
      summary: "本轮会话刚开始，还没有形成明确上下文。",
      turns: [],
      turnCount: 0,
      lastIntent: "",
      updatedAt: now()
    };
  }
  return store.sessionMemories[userId];
}

function extractGoalContext(text = "", result = {}) {
  const userText = String(text || "");
  const goalCueRegex = /目标金|目标|换手机|买手机|换电脑|买电脑|旅游|旅行|考证|学费|押金|租房|攒够|攒到|存到|准备|想用|要用|需要用|留一笔|买.{0,6}(手机|电脑|相机|车票|机票)/g;
  const timeCueRegex = /(\d+)\s*个?月后|半年后|暑假前|寒假前|年底|明年|下学期/g;
  const nonGoalAmountCue = /生活费|月收入|收入|安全垫|应急金|备用金|兼职|奖学金|餐饮|社交|预算|可支配|每月存|每个月存|月存|固定转入/;
  const amountRegex = /(\d+(?:\.\d+)?)\s*(万|w|W|千|k|K)?\s*元?/g;
  const cues = [];
  for (const regex of [goalCueRegex, timeCueRegex]) {
    regex.lastIndex = 0;
    let cue;
    while ((cue = regex.exec(userText))) cues.push(cue.index);
  }
  const targetLikeIntent =
    result.intent === "investment_decision_guidance" ||
    result.intent === "goal_setup" ||
    result.intent === "goal_update";
  const hasGoalContext = cues.length > 0 || (targetLikeIntent && /用|花|买|换|存|攒|准备|期限|之后|以后/.test(userText));
  if (!hasGoalContext) return {};

  let bestAmount = null;
  amountRegex.lastIndex = 0;
  let amountMatch;
  while ((amountMatch = amountRegex.exec(userText))) {
    const index = amountMatch.index;
    const before = userText.slice(Math.max(0, index - 10), index);
    if (nonGoalAmountCue.test(before)) continue;
    const rawNumber = Number(amountMatch[1]);
    if (!rawNumber) continue;
    const unit = amountMatch[2] || "";
    const value = unit === "万" || unit.toLowerCase() === "w"
      ? rawNumber * 10000
      : unit === "千" || unit.toLowerCase() === "k"
        ? rawNumber * 1000
        : rawNumber;
    if (value < 500 || value > 200000) continue;
    const distance = cues.length ? Math.min(...cues.map((cueIndex) => Math.abs(cueIndex - index))) : 0;
    if (distance > 42 && !targetLikeIntent) continue;
    if (!bestAmount || distance < bestAmount.distance) {
      bestAmount = { value: Math.round(value), distance };
    }
  }

  let months = null;
  const monthMatch = userText.match(/(\d+)\s*个?月后/);
  if (monthMatch) months = Number(monthMatch[1]);
  else if (/半年后/.test(userText)) months = 6;
  else if (/暑假前|寒假前|下学期/.test(userText)) months = 3;
  else if (/年底|明年/.test(userText)) months = 12;

  return {
    amount: bestAmount?.value || null,
    months,
    hasGoalContext: Boolean(cues.length || bestAmount || months)
  };
}

function inferSessionFacts(text = "", result = {}) {
  const facts = [];
  const combined = `${text}\n${result.reply || ""}`;
  const goalContext = extractGoalContext(text, result);
  if (/长期资产配置|长期配置|长期资金|配置思路/.test(combined)) facts.push("用户正在围绕长期资产配置讨论");
  if (/基金/.test(combined)) facts.push("当前主题包含基金投资");
  if (/A\s*股|A股|股票/.test(combined)) facts.push("当前主题包含高波动股票类资产");
  if (/学习|不急着买|模拟/.test(combined)) facts.push("用户倾向先学习或模拟观察");
  if (/安全垫|生活费/.test(combined)) facts.push("对话涉及生活费和安全垫边界");
  if (/回撤|下跌|亏|波动/.test(combined)) facts.push("对话涉及回撤和波动承受");
  if (/集中度|分散/.test(combined)) facts.push("对话涉及集中度和分散配置");
  if (goalContext.hasGoalContext || /目标|半年后|换手机|攒钱/.test(combined)) facts.push("对话涉及目标储蓄");
  if (/换手机/.test(combined)) facts.push("用户有换手机目标");
  if (goalContext.amount) facts.push(`用户提到目标金额约 ${goalContext.amount} 元`);
  if (goalContext.months) facts.push(`用户提到目标期限约 ${goalContext.months} 个月`);
  if (result.intent) facts.push(`上一轮意图为 ${result.intent}`);
  const uniqueFacts = Array.from(new Set(facts));
  const priorityFacts = uniqueFacts.filter((fact) => /目标金额|目标期限|换手机目标|目标储蓄/.test(fact));
  const restFacts = uniqueFacts.filter((fact) => !priorityFacts.includes(fact));
  return [...priorityFacts, ...restFacts].slice(0, 6);
}

function summarizeSession(turns = []) {
  const recent = turns.slice(-6);
  const facts = recent.flatMap((turn) => turn.facts || []);
  const uniqueFacts = Array.from(new Set(facts)).slice(-8);
  const last = recent.at(-1);
  const lastLine = last
    ? `最近一轮：用户问“${last.userQuery}”，小招已回答“${last.assistantBrief}”。`
    : "";
  const factLine = uniqueFacts.length ? `已知上下文：${uniqueFacts.join("；")}。` : "已知上下文：暂无。";
  return `${factLine}${lastLine ? ` ${lastLine}` : ""}`;
}

export function appendSessionTurn(userId = demoUserId, input = {}) {
  const memory = getSessionMemory(userId);
  const userQuery = String(input.query || "").trim();
  const reply = String(input.reply || "").trim();
  const turn = {
    id: `turn_${Date.now()}`,
    userId,
    userQuery: userQuery.slice(0, 160),
    assistantBrief: reply.replace(/\s+/g, " ").slice(0, 180),
    intent: input.intent || "",
    capability: input.capability || "",
    facts: inferSessionFacts(userQuery, input),
    createdAt: now()
  };
  memory.turns = [...(memory.turns || []), turn].slice(-8);
  memory.turnCount = (memory.turnCount || 0) + 1;
  memory.lastIntent = turn.intent;
  memory.summary = summarizeSession(memory.turns);
  memory.updatedAt = now();
  return memory;
}

export function updateProfile(userId, patch = {}) {
  const user = getUser(userId);
  user.name = patch.name || user.name;
  const { name, ...profilePatch } = patch;
  user.profile = {
    ...user.profile,
    ...profilePatch,
    updatedAt: now()
  };
  return user.profile;
}

export function applyPresetPersona(userId = demoUserId, presetId = "xiaochen") {
  const preset = demoPersonaFixtures[presetId] || demoPersonaFixtures.xiaochen;
  const store = getStore();
  const user = getUser(userId);
  if (store.sessionMemories?.[userId]) {
    delete store.sessionMemories[userId];
  }
  user.name = preset.profile.name;
  user.profile = {
    ...clone(preset.profile),
    updatedAt: now()
  };
  delete user.profile.name;

  store.personaMemories = (store.personaMemories || []).filter((memory) => memory.userId !== userId);
  store.personaMemories.push(
    ...(preset.memories || []).map((memory) => ({
      ...clone(memory),
      memoryId: `${memory.memoryId}_${Date.now()}`,
      userId,
      createdAt: now(),
      updatedAt: now()
    }))
  );

  store.transactions = (store.transactions || []).filter((txn) => txn.userId !== userId);
  store.transactions.push(
    ...(preset.transactions || []).map((txn) => ({
      ...clone(txn),
      id: `${txn.id}_${Date.now()}`,
      userId
    }))
  );

  return user;
}

export function applyXiaochenPersona(userId = demoUserId) {
  return applyPresetPersona(userId, "xiaochen");
}

export function injectPersona(userId = demoUserId, input = {}) {
  const user = getUser(userId);
  const profile = input.profile || input;
  const patch = {
    ...profile,
    profileSource: profile.profileSource || input.profileSource || "injected"
  };
  if (input.name && !patch.name) patch.name = input.name;
  if (profile.name && !patch.name) patch.name = profile.name;
  return updateProfile(userId, patch);
}

export function listTransactions(userId, { from, to } = {}) {
  return (getStore().transactions || [])
    .filter((txn) => txn.userId === userId)
    .filter((txn) => {
      const date = txn.occurredAt.slice(0, 10);
      return (!from || date >= from) && (!to || date <= to);
    })
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
}

export function createTransaction(userId, input) {
  const txn = {
    id: `txn_${Date.now()}`,
    userId,
    amount: Number(input.amount || 0),
    direction: "expense",
    category: input.category || "其他",
    merchant: input.merchant || input.category || "手动补记",
    note: input.note || "",
    source: "user_modified",
    occurredAt: input.occurredAt || now(),
    confidence: 1
  };
  getStore().transactions.unshift(txn);
  return txn;
}

export function updateTransaction(userId, id, patch) {
  const txn = (getStore().transactions || []).find((item) => item.userId === userId && item.id === id);
  if (!txn) return null;
  Object.assign(txn, patch, {
    originalCategory: txn.originalCategory || txn.category,
    source: "user_modified",
    updatedAt: now()
  });
  return txn;
}

export function listPersonaMemories(userId, filters = {}) {
  getUser(userId);
  return (getStore().personaMemories || [])
    .filter((memory) => memory.userId === userId && memory.status !== "deleted")
    .filter((memory) => {
      if (!filters.category) return true;
      return memory.relatedCategories?.includes(filters.category);
    });
}

export function createPersonaMemory(userId, input) {
  getUser(userId);
  const memory = {
    memoryId: `mem_${Date.now()}`,
    userId,
    type: input.type || "explicit_preference",
    label: input.label,
    content: input.content,
    source: input.source || "user_confirmed",
    confidence: input.confidence ?? 0.9,
    status: "active",
    privacyLevel: input.privacyLevel || "normal",
    relatedCategories: input.relatedCategories || [],
    schedule: input.schedule || {},
    usePolicy: input.usePolicy || "只用于理财陪伴相关提醒",
    createdAt: now(),
    updatedAt: now()
  };
  const store = getStore();
  store.personaMemories = [memory, ...(store.personaMemories || [])];
  return memory;
}

export function deletePersonaMemory(userId, labelOrId) {
  const memory = (getStore().personaMemories || []).find(
    (item) => item.userId === userId && (item.memoryId === labelOrId || item.label?.includes(labelOrId))
  );
  if (!memory) return null;
  memory.status = "deleted";
  memory.updatedAt = now();
  return memory;
}
