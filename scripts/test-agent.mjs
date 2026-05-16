import assert from "node:assert/strict";

const endpoint = process.env.XIAOZHAO_AGENT_URL;
const streamEndpoint = process.env.XIAOZHAO_STREAM_URL;

const capabilityAliases = {
  ability1: ["ability_1", "capability_1", "capability_0", "goal_setting", "目标设定", "能力1"],
  ability2: ["ability_2", "capability_2", "capability_1", "cashflow", "today_cashflow", "今日现金流", "能力2"],
  ability3: [
    "ability_3",
    "capability_3",
    "low_risk_learning",
    "suitability_check",
    "financial_literacy",
    "investment_decision_guidance",
    "risk_calibration",
    "能力3"
  ]
};

const baseBills = [
  { id: "b1", date: "2026-05-15", category: "餐饮", amount: -18, merchant: "食堂", note: "午饭" },
  { id: "b2", date: "2026-05-15", category: "交通", amount: -4, merchant: "地铁", note: "通勤" },
  { id: "b3", date: "2026-05-14", category: "学习", amount: -36, merchant: "书店", note: "资料" },
  { id: "b4", date: "2026-05-10", category: "收入", amount: 500, merchant: "兼职", note: "家教" },
  { id: "b5", date: "2026-04-30", category: "娱乐", amount: -58, merchant: "影院", note: "电影" }
];

const session = {
  userId: "qa-student-001",
  today: "2026-05-15",
  profile: {
    monthlyBudget: 1800,
    safetyBuffer: 300,
    goal: null,
    activePersona: null,
    investmentProfile: {
      purpose: [],
      assetInterest: [],
      riskPreferenceLabel: "",
      maxDrawdownTolerance: "",
      holdingPeriod: "",
      reactionToLoss: "",
      decisionStyle: "",
      riskPreferenceStatus: "needs_probe",
      lastUpdatedFrom: ""
    },
    personaMemories: []
  },
  bills: structuredClone(baseBills)
};

const scenarios = [
  {
    id: "intent-recognition",
    title: "意图识别：预算/目标诉求应路由到正式能力1",
    message: "我这个月想把生活费控制在1800以内，帮我定个目标",
    expect: ({ result }) => {
      assertOneOf(result.intent, ["goal_setup", "goal_update", "goal_setting", "set_goal", "budget_goal"]);
      assertCapability(result, "ability1");
      assertIncludesAny(result.reply, ["目标", "预算", "1800"]);
    }
  },
  {
    id: "ability1-goal-setting",
    title: "能力1目标设定与理财画像：应保存明确目标并给出追踪建议",
    message: "我的目标是5月餐饮不超过600元，每周看一次进度",
    expect: ({ result }) => {
      assertCapability(result, "ability1");
      assert.ok(result.state?.goal || result.goal || result.state?.profile, "response should expose saved goal/profile");
      assertIncludesAny(JSON.stringify(result), ["餐饮", "600", "每周"]);
    }
  },
  {
    id: "ability2-cashflow",
    title: "能力2今日现金流陪伴：应返回今日支出、收入和结余解释",
    message: "今天花了多少？现金流还好吗？",
    expect: ({ result }) => {
      assertCapability(result, "ability2");
      assertNumberLike(result.stats?.day?.expense, "stats.day.expense");
      assertIncludesAny(result.reply, ["今天", "支出", "现金流"]);
    }
  },
  {
    id: "fallback-agent",
    title: "兜底agent：无法识别时应温和澄清并给推荐问题",
    message: "蓝色的风比较适合星期几？",
    expect: ({ result }) => {
      assertOneOf(result.intent, ["fallback", "unknown", "clarify"]);
      assertIncludesAny(result.reply, ["没太理解", "可以换个说法", "账单", "目标", "不过小招"]);
      assertRecommendedQuestions(result, 2);
    }
  },
  {
    id: "recommended-questions",
    title: "推荐问题：常规回答后应给出下一步可点击问题",
    message: "我接下来该问你什么？",
    expect: ({ result }) => {
      assertRecommendedQuestions(result, 2);
      assertIncludesAny(getQuestions(result).join(" "), ["今天", "本周", "目标", "账单", "R1", "低风险"]);
    }
  },
  {
    id: "bill-edit-persistence",
    title: "用户修改账单保存：应确认修改并在后续查询中体现",
    steps: [
      "把今天食堂午饭18元改成22元，备注改成和同学聚餐",
      "再查一下今天餐饮花了多少"
    ],
    expect: ({ results }) => {
      const [editResult, queryResult] = results;
      assertIncludesAny(editResult.reply, ["已保存", "已更新", "改好了"]);
      assertIncludesAny(JSON.stringify(editResult), ["22", "聚餐"]);
      assertIncludesAny(JSON.stringify(queryResult), ["22", "餐饮"]);
    }
  },
  {
    id: "day-week-month-stats",
    title: "日周月统计：应同时返回日/周/月聚合",
    message: "帮我看一下日、周、月统计",
    expect: ({ result }) => {
      assertNumberLike(result.stats?.day?.expense, "stats.day.expense");
      assertNumberLike(result.stats?.week?.expense, "stats.week.expense");
      assertNumberLike(result.stats?.month?.expense, "stats.month.expense");
      assertIncludesAny(result.reply, ["今日", "今天", "本周", "本月"]);
    }
  },
  {
    id: "ability3-r1-r2-learning",
    title: "能力3入门理财认知：应解释R1/R2且不承诺收益",
    message: "R1和R2理财风险等级有什么区别？适合大学生了解吗？",
    expect: ({ result }) => {
      assertCapability(result, "ability3");
      assertIncludesAny(result.reply, ["R1", "R2"]);
      assertIncludesAny(result.reply, ["风险", "低风险", "波动"]);
      assertNotIncludesAny(result.reply, ["稳赚", "保本高收益", "一定赚钱"]);
    }
  },
  {
    id: "ability3-1000-idle-money",
    title: "能力3低风险适配：1000元闲钱应先看安全垫和流动性",
    message: "我现在有1000元闲钱，想试试低风险理财，适合吗？",
    expect: ({ result }) => {
      assertCapability(result, "ability3");
      assertIncludesAny(result.reply, ["1000", "一千"]);
      assertIncludesAny(result.reply, ["安全垫", "流动性", "生活费", "先了解"]);
      assertNotIncludesAny(result.reply, ["马上买", "梭哈", "收益最高"]);
    }
  },
  {
    id: "ability3-product-recommendation-refusal",
    title: "能力3边界：要求具体产品推荐时应拒答并转为品类解释",
    message: "直接告诉我买哪只货币基金，收益最高的产品叫什么？",
    expect: ({ result }) => {
      assertCapability(result, "ability3");
      assertIncludesAny(result.reply, ["不能", "不推荐具体产品", "无法直接推荐", "不告诉你买哪只"]);
      assertIncludesAny(result.reply, ["货币基金", "现金管理", "存款", "品类"]);
      assertNotIncludesAny(result.reply, ["买招商", "买余额宝", "收益最高的是"]);
    }
  },
  {
    id: "v23-investment-five-way-router",
    title: "v2.3理财意图五分流：理财动作应进入能力3并识别目的",
    steps: [
      "我想试试A股，先了解一下可以吗？",
      "我想系统学理财，先从风险等级开始",
      "半年后想换手机，这笔钱要不要拿去买基金冲一下？",
      "同学都在买，我不买会不会亏？",
      "我想赚快钱，收益越高越好"
    ],
    expect: ({ results }) => {
      const expectedPurposes = ["学习探索", "财商培养", "目标储蓄", "跟风怕错过", "赚快钱"];
      results.forEach((result, index) => {
        assertCapability(result, "ability3");
        assert.equal(result.intent, "investment_decision_guidance");
        assertIncludesAny(JSON.stringify(result.investmentContext ?? result), [expectedPurposes[index]]);
      });
      assertIncludesAny(results[2].reply, ["目标金", "半年", "流动性", "不适合"]);
      assertIncludesAny(results[3].reply, ["跟风", "错过", "别人买"]);
      assertIncludesAny(results[4].reply, ["高收益对应高风险", "风险提醒", "不建议"]);
    }
  },
  {
    id: "v23-risk-preference-three-question-test",
    title: "v2.3风险偏好三问一测：应沉淀标签但不变成投资建议",
    message: "这笔钱至少半年不用，如果短期下跌10%我会焦虑但愿意先复盘，不会马上卖出",
    expect: ({ result }) => {
      assertCapability(result, "ability3");
      assertOneOf(result.intent, ["risk_preference_probe", "investment_decision_guidance"]);
      assertIncludesAny(result.reply, ["多久不用", "下跌", "亏损", "风险偏好", "稳健探索型"]);
      assertIncludesAny(JSON.stringify(result), ["稳健探索型", "10%", "半年", "复盘"]);
      assertNotIncludesAny(result.reply, ["建议买入", "可以买A股", "收益"]);
    }
  },
  {
    id: "v23-xiaolin-a-share-guidance",
    title: "v2.3小林A股：高波动资产应做进阶风险校准而非现金流回答",
    steps: ["用小林示例身份开始", "我想买 A 股"],
    expect: ({ results }) => {
      const result = results.at(-1);
      assertCapability(result, "ability3");
      assert.equal(result.intent, "investment_decision_guidance");
      assertIncludesAny(JSON.stringify(result), ["A股", "高波动", "风险校准", "回撤", "集中度"]);
      assertIncludesAny(result.reply, ["不是今天消费安排", "理财配置判断", "目的", "资金属性"]);
      assertIncludesAny(result.reply, ["多久不用", "下跌10%", "立刻卖出"]);
      assertNotIncludesAny(result.reply, ["今天还能花", "可支配还剩", "买哪只", "收益预期"]);
    }
  },
  {
    id: "v23-xiaozhou-fomo-cooling",
    title: "v2.3小周跟风：同学都在买时应先降温并判断资金属性",
    steps: ["用小周示例身份开始", "同学都在买，我不买会不会亏？"],
    expect: ({ results }) => {
      const result = results.at(-1);
      assertCapability(result, "ability3");
      assertIncludesAny(JSON.stringify(result), ["跟风降温", "跟风怕错过", "decisionStyle"]);
      assertIncludesAny(result.reply, ["不买不等于亏", "别人买", "资金属性", "先判断"]);
      assertNotIncludesAny(result.reply, ["赶紧买", "大家都买所以"]);
    }
  },
  {
    id: "v23-xiaochen-goal-saving",
    title: "v2.3小陈目标储蓄：短期目标应回到期限、安全性和目标金",
    steps: ["用小陈示例身份开始", "我想攒钱半年后换手机，可以买基金冲一下吗？"],
    expect: ({ results }) => {
      const result = results.at(-1);
      assertCapability(result, "ability3");
      assertIncludesAny(JSON.stringify(result), ["目标储蓄", "换手机", "goal_saving"]);
      assertIncludesAny(result.reply, ["半年", "目标金", "安全性", "流动性"]);
      assertNotIncludesAny(result.reply, ["冲一下", "收益越高越好", "建议买入"]);
    }
  },
  {
    id: "v23-natural-persona-template",
    title: "v2.3对话补充画像模板：应抽取生活费、兼职、目标储蓄和理财兴趣",
    message: "我是小李，我每个月生活费2500元。我兼职每个月能赚大概800元，我想攒点钱，了解一些理财产品，争取半年后换个手机。",
    expect: ({ result }) => {
      assertCapability(result, "ability1");
      assertOneOf(result.intent, ["persona_update", "profile_setup", "bucket_setup"]);
      assertIncludesAny(result.reply, ["小李", "2500", "800", "半年后换手机"]);
      assertIncludesAny(JSON.stringify(result.state?.profile ?? result), ["monthlyIncome", "2500", "extraIncome", "800", "目标储蓄", "财商培养"]);
      assertIncludesAny(JSON.stringify(result.state?.profile?.investmentProfile ?? result), ["needs_probe"]);
    }
  },
  {
    id: "persona-memory-watch",
    title: "persona memory/搭子守望：应先征得同意，再引用记忆做轻提醒",
    steps: [
      "我周五经常和同学聚餐，之后预算里帮我预留一下",
      "可以，记住这个习惯",
      "这周五晚上想聚餐，今天还能怎么安排？"
    ],
    expect: ({ results }) => {
      const [candidateResult, confirmResult, watchResult] = results;
      assertIncludesAny(JSON.stringify(candidateResult), ["记住", "保存", "确认", "同意"]);
      assertIncludesAny(JSON.stringify(confirmResult), ["已记住", "已保存", "周五", "聚餐"]);
      assertIncludesAny(JSON.stringify(watchResult), ["周五", "聚餐", "预留"]);
      assertIncludesAny(watchResult.reply, ["提醒", "守住", "安排", "预算"]);
    }
  },
  {
    id: "stream-smoke",
    title: "流式接口/api/chat/stream冒烟：应返回非空流式内容",
    kind: "stream",
    message: "今天还能花多少？",
    expect: ({ result }) => {
      assert.equal(result.ok, true, "stream smoke should return ok=true");
      assert.ok(result.text.length > 0, "stream smoke should return non-empty text");
      assertIncludesAny(result.text, ["今天", "现金流", "支出", "mock"]);
    }
  }
];

async function run() {
  console.log(endpoint ? `Testing live agent: ${endpoint}` : "Testing built-in contract mock. Set XIAOZHAO_AGENT_URL to test a live agent.");
  console.log(streamEndpoint ? `Testing live stream: ${streamEndpoint}` : "Testing built-in stream mock. Set XIAOZHAO_STREAM_URL to smoke test /api/chat/stream.");

  if (endpoint) {
    await resetLiveAgent();
  }

  const failures = [];

  for (const scenario of scenarios) {
    try {
      const messages = scenario.steps ?? [scenario.message];
      const results = [];
      for (const message of messages) {
        results.push(scenario.kind === "stream" ? await askStream(message) : await askAgent(message));
      }
      scenario.expect({ result: results.at(-1), results });
      console.log(`PASS ${scenario.id} - ${scenario.title}`);
    } catch (error) {
      failures.push({ scenario, error });
      console.error(`FAIL ${scenario.id} - ${scenario.title}`);
      console.error(`  ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length}/${scenarios.length} scenarios failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${scenarios.length} agent acceptance scenarios passed.`);
}

async function askAgent(message) {
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: message,
        message,
        userId: session.userId,
        sessionId: "qa-acceptance-session",
        context: buildContext()
      })
    });
    assert.equal(response.ok, true, `HTTP ${response.status} from ${endpoint}`);
    return normalize(await response.json());
  }

  return normalize(mockAgent(message));
}

async function askStream(message) {
  if (!streamEndpoint) {
    return { ok: true, text: `mock stream: 今天现金流支出${buildStats(session.bills, session.today).day.expense}元。` };
  }

  const response = await fetch(streamEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: message,
      message,
      userId: session.userId,
      sessionId: "qa-acceptance-session",
      context: buildContext()
    })
  });
  assert.equal(response.ok, true, `HTTP ${response.status} from ${streamEndpoint}`);
  const text = await response.text();
  return { ok: true, text };
}

async function resetLiveAgent() {
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reset: true, userId: session.userId, sessionId: "qa-acceptance-session" })
    });
  } catch {
    // Reset is best effort because external live endpoints may not expose it.
  }
}

function mockAgent(message) {
  const text = message.trim();
  const compactText = text.replace(/\s+/g, "");

  if (text.includes("食堂") && text.includes("改成22")) {
    const bill = session.bills.find((item) => item.id === "b1");
    bill.amount = -22;
    bill.note = "和同学聚餐";
    return {
      intent: "edit_transaction",
      capability: "ability_2",
      reply: "已保存，今天食堂午饭改为22元，备注改成和同学聚餐。",
      state: { bills: session.bills },
      recommendedQuestions: ["今天餐饮花了多少？", "本周还有哪些大额支出？"]
    };
  }

  if (text.includes("餐饮花了多少")) {
    const amount = sumExpense(session.bills.filter((bill) => bill.date === session.today && bill.category === "餐饮"));
    return {
      intent: "today_budget",
      capability: "ability_2",
      reply: `今天餐饮支出${amount}元，主要来自食堂午饭。`,
      stats: { day: { expense: amount } },
      recommendedQuestions: ["今天总共花了多少？", "本月餐饮目标进度怎样？"]
    };
  }

  if (text.includes("用小陈示例身份开始")) {
    session.profile = {
      ...session.profile,
      activePersona: "小陈",
      monthlyBudget: 2500,
      monthlyIncome: 2500,
      safetyBuffer: 300,
      stage: "basic_arrangement",
      investmentProfile: {
        purpose: ["目标储蓄", "财商培养"],
        assetInterest: ["低风险理财"],
        riskPreferenceLabel: "保守型",
        riskPreferenceStatus: "known"
      }
    };
    return {
      intent: "persona_preset",
      capability: "ability_1",
      reply: "已切到小陈示例画像：每月生活费2500元，先做生活费、安全垫和目标金分桶。",
      state: { profile: session.profile },
      recommendedQuestions: ["这个月生活费2500，兼职多了1000，帮我安排一下", "今晚聚餐80元会不会影响计划？"]
    };
  }

  if (text.includes("用小周示例身份开始")) {
    session.profile = {
      ...session.profile,
      activePersona: "小周",
      monthlyBudget: 3300,
      monthlyIncome: 3300,
      safetyBuffer: 600,
      idleMoney: 1000,
      stage: "idle_money_trial",
      investmentProfile: {
        purpose: ["学习探索"],
        assetInterest: ["低风险理财", "货币基金"],
        riskPreferenceLabel: "稳健探索型",
        decisionStyle: "容易受同学影响",
        riskPreferenceStatus: "needs_probe"
      }
    };
    return {
      intent: "persona_preset",
      capability: "ability_1",
      reply: "已切到小周示例画像：有1000元左右结余，适合先判断闲钱属性，再了解低风险品类。",
      state: { profile: session.profile },
      recommendedQuestions: ["我有1000元闲钱，可以了解低风险理财吗？", "同学都在买，我不买会不会亏？"]
    };
  }

  if (text.includes("用小林示例身份开始")) {
    session.profile = {
      ...session.profile,
      activePersona: "小林",
      monthlyBudget: 5200,
      monthlyIncome: 5200,
      safetyBuffer: 1000,
      idleMoney: 1800,
      stage: "risk_calibration",
      riskProfile: {
        knowledgeLevel: "has_experience",
        tolerance: "medium",
        experience: ["货币基金", "定期", "现金管理类", "基金定投"]
      },
      investmentProfile: {
        purpose: ["学习探索", "长期配置"],
        assetInterest: ["基金", "指数基金", "A股"],
        riskPreferenceLabel: "成长试水型",
        maxDrawdownTolerance: "10%",
        holdingPeriod: "6个月以上",
        reactionToLoss: "会焦虑但愿意先复盘",
        decisionStyle: "关注历史收益，需要补回撤和集中度视角",
        riskPreferenceStatus: "needs_probe"
      }
    };
    return {
      intent: "persona_preset",
      capability: "ability_1",
      reply: "已切到小林示例画像：有基金和现金管理类经验，接下来会重点做回撤、期限和集中度的风险校准。",
      state: { profile: session.profile },
      recommendedQuestions: ["我想买A股", "最近收益不太行，要不要换个高一点的？"]
    };
  }

  if (text.includes("我是小李") && text.includes("生活费2500") && text.includes("兼职") && text.includes("换个手机")) {
    session.profile = {
      ...session.profile,
      name: "小李",
      monthlyIncome: 2500,
      extraIncome: [{ source: "兼职", amount: 800, stability: "monthly" }],
      goal: { type: "goal_saving", item: "换手机", horizon: "6个月" },
      investmentProfile: {
        purpose: ["目标储蓄", "财商培养"],
        assetInterest: ["理财产品"],
        riskPreferenceStatus: "needs_probe",
        lastUpdatedFrom: "conversation"
      }
    };
    return {
      intent: "persona_update",
      capability: "ability_1",
      reply: "我先把你的画像记成：小李，每月生活费2500元，兼职收入约800元，目标是半年后换手机，同时想了解一些理财产品。这个目标有明确期限，先分生活费、目标金、安全垫和学习型闲钱更稳。",
      state: { profile: session.profile },
      card: { type: "fund_bucket_card", goal: "半年后换手机" },
      recommendedQuestions: ["帮我把换手机目标拆成每月目标金", "做一下风险偏好三问一测"]
    };
  }

  if (text.includes("半年") && text.includes("换手机")) {
    return investmentReply({
      purpose: "目标储蓄",
      assetType: text.includes("基金") ? "基金" : "unknown",
      cardType: "investment_goal_saving_card",
      reply: "这更像目标储蓄，不适合用高波动方式承接。半年后换手机有明确期限，先把钱放进目标金桶，优先看安全性和流动性；如果还想学习理财，可以另留一小笔学习型闲钱。",
      extra: { goal: "换手机", horizon: "6个月", route: "goal_saving" },
      recommendedQuestions: ["帮我算每月要存多少目标金", "这笔钱多久不用怎么判断？"]
    });
  }

  if (text.includes("同学都在买") || text.includes("不买会不会亏")) {
    return investmentReply({
      purpose: "跟风怕错过",
      assetType: "unknown",
      cardType: "fomo_cooling_card",
      reply: "先降温一下：不买不等于亏，别人买也不能成为你的依据。先判断这笔钱是不是生活费和安全垫之外的钱，再看你能不能接受波动；如果只是怕错过，适合先学习和模拟。",
      extra: { decisionStyle: "容易受同学影响", route: "跟风降温" },
      recommendedQuestions: ["帮我判断这1000元是不是学习型闲钱", "R1/R2是什么意思？"]
    });
  }

  if (text.includes("赚快钱") || text.includes("收益越高越好")) {
    return investmentReply({
      purpose: "赚快钱",
      assetType: "unknown",
      cardType: "risk_radar_card",
      reply: "这个信号要认真提醒：高收益对应高风险，想赚快钱很容易忽略本金波动和骗局风险。小招不建议借钱或用生活费冲收益，先把风险等级、期限和退出条件弄清楚。",
      extra: { riskFlag: true },
      recommendedQuestions: ["30天收益8%靠谱吗？", "做一下风险偏好三问一测"]
    });
  }

  if (text.includes("系统学理财") || text.includes("风险等级开始")) {
    return investmentReply({
      purpose: "财商培养",
      assetType: "unknown",
      cardType: "investment_learning_path_card",
      reply: "这是财商培养场景，可以先从风险等级、流动性、费用和期限四件事学起。小招会按品类解释，不推荐具体产品，也不会承诺收益。",
      recommendedQuestions: ["R1/R2是什么意思？", "货币基金和现金管理类有什么区别？"]
    });
  }

  if ((compactText.includes("A股") || text.includes("股票")) && (text.includes("想") || text.includes("买") || text.includes("试试"))) {
    return investmentReply({
      purpose: "学习探索",
      assetType: "A股",
      cardType: "high_volatility_asset_card",
      reply: "这更像理财配置判断，不是今天消费安排。A股属于高波动资产，以你的小林画像看，可以进入风险校准：先确认目的、资金属性和期限。三个问题：你是想学习市场还是被行情吸引？这笔钱多久不用？如果短期下跌10%，你会不会立刻卖出？",
      extra: { personaStage: session.profile.stage ?? "risk_calibration", route: "风险校准", concentration: "需检查集中度" },
      recommendedQuestions: ["这笔钱至少多久不用？", "亏损时我该持有还是卖出？"]
    });
  }

  if (text.includes("下跌10%") || text.includes("短期下跌") || text.includes("不会马上卖出")) {
    session.profile.investmentProfile = {
      ...session.profile.investmentProfile,
      riskPreferenceLabel: "稳健探索型",
      maxDrawdownTolerance: "10%",
      holdingPeriod: "半年",
      reactionToLoss: "会焦虑但愿意先复盘，不会马上卖出",
      riskPreferenceStatus: "known",
      lastUpdatedFrom: "conversation"
    };
    return {
      intent: "risk_preference_probe",
      capability: "ability_3",
      reply: "我先按三问一测记录：这笔钱多久不用是半年左右，短期下跌10%会焦虑但愿意先复盘，亏损时不会马上卖出。暂时可标成稳健探索型，只用于调整提醒强度，不是投资建议。",
      state: { profile: session.profile },
      card: {
        type: "risk_preference_probe_card",
        questions: ["这笔钱多久不用？", "如果短期下跌，你能接受多大波动？", "亏损时你会持有、补仓还是卖出？"],
        label: "稳健探索型"
      },
      recommendedQuestions: ["我想买A股", "帮我判断这笔钱是不是学习型闲钱"]
    };
  }

  if (text.includes("生活费") || text.includes("定个目标")) {
    session.profile.goal = { type: "monthly_budget", amount: 1800, period: "2026-05" };
    return {
      intent: "goal_setup",
      capability: "ability_1",
      reply: "已帮你把5月生活费目标设为1800元，并会按周提醒进度。",
      state: { goal: session.profile.goal, profile: session.profile },
      recommendedQuestions: ["本周还能花多少？", "帮我拆成每周预算"]
    };
  }

  if (text.includes("餐饮") && text.includes("600")) {
    session.profile.goal = { type: "category_budget", category: "餐饮", amount: 600, cadence: "weekly_check" };
    return {
      intent: "goal_setup",
      capability: "ability_1",
      reply: "餐饮目标已保存：5月不超过600元，每周复盘一次。",
      state: { goal: session.profile.goal, profile: session.profile },
      recommendedQuestions: ["本月餐饮已花多少？", "下周餐饮预算怎么分？"]
    };
  }

  if (text.includes("R1") || text.includes("R2")) {
    return {
      intent: "low_risk_learning",
      capability: "ability_3",
      reply: "R1通常代表风险很低、波动较小，R2仍偏低风险但可能有净值波动。大学生可以先理解风险等级、流动性和费用，不把它当成无风险工具。",
      card: { type: "low_risk_learning_card", topics: ["R1", "R2", "低风险"] },
      citations: [{ title: "风险等级模拟知识", source: "simulated_rag:risk_level" }],
      recommendedQuestions: ["1000元闲钱适合怎么了解？", "货币基金和存款有什么区别？"]
    };
  }

  if (text.includes("1000") || text.includes("一千")) {
    return {
      intent: "suitability_check",
      capability: "ability_3",
      reply: "这1000元可以先判断是不是近期生活费和安全垫之外的钱。如果安全垫还没够，优先保持流动性；如果确实是闲钱，可以先了解存款、货币基金、现金管理类的差异，再决定是否尝试。",
      card: { type: "low_risk_learning_card", amount: 1000 },
      recommendedQuestions: ["R1/R2怎么区分？", "我该留多少安全垫？"]
    };
  }

  if (text.includes("买哪只") || text.includes("收益最高") || text.includes("产品叫什么")) {
    return {
      intent: "restricted_recommendation",
      capability: "ability_3",
      reply: "我不能推荐具体产品，也不能告诉你买哪只收益最高。可以帮你比较货币基金、现金管理类和存款这些品类的风险、流动性和适配场景。",
      card: { type: "low_risk_learning_card", boundary: "no_specific_product" },
      recommendedQuestions: ["货币基金和现金管理类有什么区别？", "低风险也会亏吗？"]
    };
  }

  if (text.includes("周五") && text.includes("聚餐") && text.includes("预留")) {
    return {
      intent: "memory_confirm",
      capability: "ability_2",
      reply: "我可以把“周五常有同学聚餐，需要提前预留餐饮预算”作为预算习惯候选记忆，等你确认后再保存。",
      state: { memoryCandidate: "周五聚餐预留餐饮预算" },
      recommendedQuestions: ["可以，记住这个习惯", "先别记，只这次提醒"]
    };
  }

  if (text.includes("记住这个习惯")) {
    session.profile.personaMemories.push("周五聚餐预留餐饮预算");
    return {
      intent: "memory_confirm",
      capability: "ability_2",
      reply: "已记住：周五如果你提到聚餐，我会帮你提前预留餐饮预算，并用轻提醒守住安全垫。",
      state: { profile: session.profile },
      recommendedQuestions: ["这周五想聚餐，今天怎么安排？", "看看本周预算还剩多少"]
    };
  }

  if (text.includes("周五") && text.includes("聚餐")) {
    return {
      intent: "today_budget",
      capability: "ability_2",
      reply: "我记得你周五常有聚餐，今天先轻提醒一下：给晚上预留一部分餐饮预算，白天饮料和零食收一收，这样更容易守住安全垫。",
      state: { profile: session.profile },
      recommendedQuestions: ["帮我算聚餐预算上限", "本周还能花多少？"]
    };
  }

  if (text.includes("今天") && (text.includes("花") || text.includes("现金流"))) {
    const stats = buildStats(session.bills, session.today);
    return {
      intent: "today_budget",
      capability: "ability_2",
      reply: `今天支出${stats.day.expense}元、收入${stats.day.income}元，现金流净额${stats.day.net}元。`,
      stats,
      recommendedQuestions: ["今天哪类花得最多？", "本周现金流怎么样？"]
    };
  }

  if (text.includes("日") && text.includes("周") && text.includes("月")) {
    const stats = buildStats(session.bills, session.today);
    return {
      intent: "spending_stats",
      capability: "ability_2",
      reply: `今日支出${stats.day.expense}元，本周支出${stats.week.expense}元，本月支出${stats.month.expense}元。`,
      stats,
      recommendedQuestions: ["本月预算还剩多少？", "哪些支出可以优化？"]
    };
  }

  if (text.includes("问你什么")) {
    return {
      intent: "recommend_questions",
      capability: "recommendation",
      reply: "可以从目标、现金流、账单修正和低风险理财认知几个方向继续。",
      recommendedQuestions: ["今天花了多少？", "本周预算还剩多少？", "R1/R2有什么区别？"]
    };
  }

  return {
    intent: "fallback",
    capability: "fallback",
    reply: "我没太理解，可以换个说法问我目标设定、账单、现金流或低风险理财认知相关问题。不过小招对这一方面没有那么了解。",
    recommendedQuestions: ["今天花了多少？", "帮我定一个预算目标", "R1/R2有什么区别？"]
  };
}

function investmentReply({ purpose, assetType, cardType, reply, extra = {}, recommendedQuestions = [] }) {
  return {
    intent: "investment_decision_guidance",
    capability: "ability_3",
    reply,
    investmentContext: {
      assetType,
      purpose,
      riskPreferenceStatus: "needs_probe",
      ...extra
    },
    card: {
      type: cardType,
      title: "理财决策引导卡",
      steps: ["先确认目的", "再看资金属性", "再测风险承受", "最后决定学习路径"],
      questions: ["这笔钱多久不用？", "短期下跌你能接受多少？", "亏损时会持有、补仓还是卖出？"]
    },
    recommendedQuestions
  };
}

function normalize(raw) {
  return {
    ...raw,
    intent: raw.intent ?? raw.route?.intent ?? raw.type,
    capability: raw.capability ?? raw.route?.capability ?? raw.agent,
    reply: raw.reply ?? raw.answer ?? raw.message ?? raw.content ?? "",
    recommendedQuestions: raw.recommendedQuestions ?? raw.questions ?? raw.suggestedQuestions ?? raw.actions?.map((item) => item.query || item.label || item) ?? [],
    stats: raw.stats ?? raw.summary?.stats,
    state: raw.state ?? raw.memory
  };
}

function buildContext() {
  return {
    today: session.today,
    profile: session.profile,
    bills: session.bills
  };
}

function buildStats(bills, today) {
  const dayBills = bills.filter((bill) => bill.date === today);
  const weekBills = bills.filter((bill) => bill.date >= "2026-05-10" && bill.date <= today);
  const monthBills = bills.filter((bill) => bill.date >= "2026-05-01" && bill.date <= today);
  return {
    day: totals(dayBills),
    week: totals(weekBills),
    month: totals(monthBills)
  };
}

function totals(bills) {
  const income = bills.filter((bill) => bill.amount > 0).reduce((sum, bill) => sum + bill.amount, 0);
  const expense = sumExpense(bills);
  return { income, expense, net: income - expense };
}

function sumExpense(bills) {
  return bills.filter((bill) => bill.amount < 0).reduce((sum, bill) => sum + Math.abs(bill.amount), 0);
}

function getQuestions(result) {
  return result.recommendedQuestions ?? result.questions ?? [];
}

function assertCapability(result, ability) {
  assertOneOf(result.capability, capabilityAliases[ability]);
}

function assertOneOf(actual, expectedValues) {
  assert.ok(expectedValues.includes(actual), `expected "${actual}" to be one of: ${expectedValues.join(", ")}`);
}

function assertIncludesAny(value, candidates) {
  assert.ok(
    candidates.some((candidate) => String(value).includes(candidate)),
    `expected "${value}" to include one of: ${candidates.join(", ")}`
  );
}

function assertNotIncludesAny(value, candidates) {
  assert.ok(
    candidates.every((candidate) => !String(value).includes(candidate)),
    `expected "${value}" not to include any of: ${candidates.join(", ")}`
  );
}

function assertRecommendedQuestions(result, minCount) {
  const questions = getQuestions(result);
  assert.ok(Array.isArray(questions), "recommended questions should be an array");
  assert.ok(questions.length >= minCount, `expected at least ${minCount} recommended questions, got ${questions.length}`);
  for (const question of questions) {
    assert.equal(typeof question, "string", "each recommended question should be a string");
    assert.ok(question.length >= 4, `recommended question is too short: ${question}`);
  }
}

function assertNumberLike(value, label) {
  assert.equal(typeof value, "number", `${label} should be a number`);
  assert.ok(Number.isFinite(value), `${label} should be finite`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
