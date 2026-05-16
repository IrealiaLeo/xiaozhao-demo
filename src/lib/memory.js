import { createPersonaMemory, deletePersonaMemory, listPersonaMemories } from "./store";

export function getRelevantPersonaMemory({ userId, intent, category, topK = 5 }) {
  const memories = listPersonaMemories(userId, { category });
  const ranked = memories
    .map((memory) => {
      let score = memory.confidence || 0.5;
      if (category && memory.relatedCategories?.includes(category)) score += 0.5;
      if (intent?.includes("budget") && memory.type === "recurring_event") score += 0.2;
      return { ...memory, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return ranked.map(({ score, ...memory }) => memory);
}

export function detectMemoryCandidate(query) {
  if (/周五|周末|每周|一般|经常/.test(query) && /聚餐|出去|朋友|女朋友|约会|吃饭/.test(query)) {
    return {
      type: "recurring_event",
      label: "周五社交餐饮预算",
      content: "用户周五或周末可能有社交餐饮支出，预算建议需要提前预留。",
      relatedCategories: ["餐饮", "社交"],
      privacyLevel: "normal",
      schedule: { dayOfWeek: "Friday", timeRange: "evening" },
      usePolicy: "只保存预算相关的周五社交餐饮习惯，不保存具体关系细节"
    };
  }
  return null;
}

export function handleMemoryIntent({ userId, query, intent }) {
  if (/删|删除|忘掉/.test(query)) {
    const deleted = deletePersonaMemory(userId, "周五");
    return {
      reply: deleted ? `已删除“${deleted.label}”这条记忆。` : "我没找到对应记忆，你可以问“你记住了什么”。",
      card: {
        type: "memory_list_card",
        title: "记忆已更新",
        memories: listPersonaMemories(userId)
      },
      actions: [
        { label: "查看记忆", query: "你记住了什么？" },
        { label: "设定目标", query: "先帮我定个理财小目标" }
      ]
    };
  }

  if (intent === "memory_list") {
    return {
      reply: "我目前记住的都是和预算有关的轻量习惯，你可以随时让我删除。",
      card: {
        type: "memory_list_card",
        title: "小招记住的预算习惯",
        memories: listPersonaMemories(userId).map((memory) => ({
          label: memory.label,
          content: memory.content,
          privacyLevel: memory.privacyLevel
        }))
      },
      actions: [
        { label: "删除周五聚餐", query: "把周五聚餐这个记忆删掉" },
        { label: "安排今天的消费", query: "帮我看看今天的消费空间" }
      ]
    };
  }

  if (intent === "memory_confirm") {
    const memory = createPersonaMemory(userId, {
      type: "recurring_event",
      label: "周五社交餐饮预算",
      content: "用户确认周五需要预留社交餐饮预算。",
      relatedCategories: ["餐饮", "社交"],
      schedule: { dayOfWeek: "Friday", timeRange: "evening" },
      usePolicy: "用于预算预留，不提私人关系细节"
    });
    return {
      reply: `记住了：以后我会把“${memory.label}”作为预算预留参考。`,
      card: {
        type: "memory_confirm_card",
        title: "已保存预算习惯",
        memory
      },
      actions: [
        { label: "安排今天的消费", query: "帮我看看今天的消费空间" },
        { label: "查看记忆", query: "你记住了什么？" }
      ]
    };
  }

  return {
    reply: "好，这次我不保存为长期记忆，只按当前这轮预算来参考。",
    card: {
      type: "memory_confirm_card",
      title: "未保存预算习惯",
      memory: null
    },
    actions: [
      { label: "安排今天的消费", query: "帮我看看今天的消费空间" },
      { label: "查看记忆", query: "你记住了什么？" }
    ]
  };
}
