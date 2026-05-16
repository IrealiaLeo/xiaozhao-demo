import { knowledgeSnippets } from "./mockData";

export function knowledgeSearch(query, intent) {
  const text = `${query} ${intent}`;
  const scored = knowledgeSnippets
    .map((snippet) => {
      const score = snippet.keywords.reduce((sum, keyword) => {
        return sum + (text.includes(keyword) ? 1 : 0);
      }, 0);
      return { ...snippet, score };
    })
    .filter((snippet) => snippet.score > 0)
    .sort((a, b) => b.score - a.score);

  const snippets = scored.length > 0 ? scored.slice(0, 3) : knowledgeSnippets.slice(0, 2);
  return {
    snippets: snippets.map(({ score, ...snippet }) => snippet),
    constraints: ["不承诺收益", "不推荐具体产品", "不编造收益或产品", "不绕过风险测评", "低风险不等于无风险", "不鼓励借贷理财"],
    mode: "simulated_rag"
  };
}

export function assessSuitability({ profile, budget, query }) {
  const requestedAmountMatch = query.match(/(\d+(?:\.\d+)?)\s*(元|块)?/);
  const requestedAmount = requestedAmountMatch ? Number(requestedAmountMatch[1]) : null;
  const safetyGap = Math.max(0, Number(profile.safetyBuffer || 0) - Math.max(0, budget.spendable));

  if (budget.status === "alert" || safetyGap > 0) {
    return {
      level: "先补安全垫",
      code: "A",
      summary: "现在更适合先补安全垫，不急着进入理财配置。",
      reasons: [
        `你设置了 ${profile.safetyBuffer} 元安全垫`,
        `今天建议可花 ${budget.spendable} 元，现金流还需要先稳住`,
        "入门理财前应先保证未来必要支出"
      ]
    };
  }

  if (requestedAmount && requestedAmount <= 1500) {
    return {
      level: "小金额学习",
      code: "B",
      summary: "可以先用小金额学习低风险品类，但不要把生活费一次性投入。",
      reasons: [
        "金额不大，适合作为认知学习入口",
        "仍需确认这笔钱 1 个月内是否会用到",
        "重点先看风险等级、期限、流动性和费用"
      ]
    };
  }

  return {
    level: "品类级方向",
    code: "C",
    summary: "可以了解低风险品类方向，但小招不提供具体产品推荐。",
    reasons: [
      "目标画像和现金流暂时可控",
      "仍需结合期限和风险承受能力",
      "只做品类认知，不做交易导购"
    ]
  };
}
