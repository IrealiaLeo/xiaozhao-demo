export function planCompanionNudge({ budget, latestTransaction, memories }) {
  if (!latestTransaction) return null;
  const drinkMemory = memories.find((memory) => memory.relatedCategories?.includes("饮品"));
  const warning = budget.warnings?.find((item) => item.category === latestTransaction.category);

  if (warning || (latestTransaction.category === "饮品" && drinkMemory)) {
    return {
      type: "companion_nudge_card",
      title: "搭子轻提醒",
      trigger: `${latestTransaction.category}_budget_near_limit`,
      severity: warning?.ratio >= 1 ? "high" : "medium",
      message:
        latestTransaction.category === "饮品"
          ? "奶茶预算快到线了，我只轻轻提醒一下。今天可以喝，但周末饮品预算要收一点。"
          : `${latestTransaction.category}这类支出接近本周预算线了，可以做一次小调整。`,
      microPlan: ["先不责备这笔支出", "把下一次同类消费延后一天", "周末保留必要社交预算"]
    };
  }
  return null;
}
