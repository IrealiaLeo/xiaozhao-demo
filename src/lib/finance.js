import { categoryKeywords } from "./mockData";

export function classifyText(text = "") {
  const compact = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((word) => compact.includes(word.toLowerCase()))) {
      return category;
    }
  }
  return "其他";
}

export function parseAmount(text = "") {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(元|块|rmb)?/i);
  return match ? Number(match[1]) : null;
}

export function getDateRange(period = "today") {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (period === "today") return { from: today, to: today };

  const start = new Date(now);
  if (period === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  }
  if (period === "month") {
    start.setDate(1);
  }
  return { from: start.toISOString().slice(0, 10), to: today };
}

export function summarizeTransactions(transactions) {
  const total = transactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
  const byCategory = transactions.reduce((acc, txn) => {
    acc[txn.category] = (acc[txn.category] || 0) + Number(txn.amount || 0);
    return acc;
  }, {});
  const topCategories = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { total, byCategory, topCategories };
}

export function calculateBudget({ profile, todayTransactions, weekTransactions }) {
  const fixed = (profile.fixedExpenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthlyFlexible = Math.max(
    0,
    Number(profile.monthlyIncome || 0) - fixed - Number(profile.safetyBuffer || 0)
  );
  const dailyBase = monthlyFlexible / 30;
  const todaySpent = summarizeTransactions(todayTransactions).total;
  const weekSummary = summarizeTransactions(weekTransactions);
  const daysLeftInMonth = Math.max(1, 30 - new Date().getDate() + 1);
  const monthPaceAdjustment = daysLeftInMonth <= 7 ? 0.9 : 1;
  const spendable = Math.max(0, Math.round((dailyBase - todaySpent) * monthPaceAdjustment));

  const warnings = [];
  for (const limit of profile.categoryLimits || []) {
    if (limit.cycle !== "weekly") continue;
    const used = weekSummary.byCategory[limit.category] || 0;
    const ratio = used / limit.limit;
    if (ratio >= 0.8) {
      warnings.push({
        category: limit.category,
        used,
        limit: limit.limit,
        ratio,
        message: `${limit.category}本周已用 ${Math.round(ratio * 100)}%`
      });
    }
  }

  let status = "normal";
  if (spendable < dailyBase * 0.3) status = "alert";
  else if (spendable < dailyBase * 0.8) status = "tight";
  else if (spendable > dailyBase * 1.2) status = "relaxed";

  return {
    spendable,
    status,
    dailyBase: Math.round(dailyBase),
    todaySpent,
    weekSummary,
    warnings,
    why: [
      `你设置了 ${profile.safetyBuffer || 0} 元安全垫`,
      `今日已确认支出 ${todaySpent} 元`,
      warnings[0]?.message || "本周主要类别仍在可控范围"
    ]
  };
}

export function assessDataQuality(transactions) {
  if (transactions.length >= 4) {
    return { level: "high", hint: "今日账单较完整" };
  }
  if (transactions.length >= 2) {
    return { level: "medium", hint: "可能缺少校园卡、现金或第三方支付小额消费" };
  }
  return { level: "low", hint: "今日账单较少，建议补记一笔后再判断" };
}
