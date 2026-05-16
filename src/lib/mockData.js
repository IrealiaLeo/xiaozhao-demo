export const demoUserId = "demo-student";

const now = new Date();
const today = now.toISOString().slice(0, 10);
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

export const emptyProfile = {
  stage: "",
  monthlyIncome: null,
  incomeSources: [],
  extraIncome: [],
  fixedExpenses: [],
  safetyBuffer: null,
  idleMoney: null,
  coachStyle: "gentle",
  primaryGoal: "",
  reminderCadence: "light",
  categoryLimits: [],
  riskProfile: {
    knowledgeLevel: "unknown",
    tolerance: "unknown",
    experience: []
  },
  investmentProfile: {
    purpose: [],
    assetInterest: [],
    riskPreferenceLabel: "",
    maxDrawdownTolerance: "",
    holdingPeriod: "",
    reactionToLoss: "",
    decisionStyle: "",
    goal: "",
    goalHorizon: "",
    riskPreferenceStatus: "needs_probe",
    lastUpdatedFrom: ""
  },
  behaviorPatterns: [],
  profileSource: "empty",
  updatedAt: new Date().toISOString()
};

export const initialStore = {
  users: {
    [demoUserId]: {
      id: demoUserId,
      name: "同学",
      profile: { ...emptyProfile }
    }
  },
  personaMemories: [],
  transactions: [],
  messages: []
};

export const xiaochenProfile = {
  name: "小陈",
  stage: "basic_arrangement",
  grade: "大二",
  schoolLife: "生活费自主支配，偶尔做兼职，周五常和朋友出去玩",
  monthlyIncome: 2500,
  incomeSources: ["生活费", "偶尔兼职"],
  extraIncome: [],
  fixedExpenses: [
    { name: "话费", amount: 50 },
    { name: "交通", amount: 120 },
    { name: "会员", amount: 30 }
  ],
  safetyBuffer: 300,
  idleMoney: 200,
  coachStyle: "gentle",
  primaryGoal: "控制餐饮和饮品消费，月底留住安全垫",
  reminderCadence: "light",
  categoryLimits: [
    { category: "餐饮", cycle: "weekly", limit: 460 },
    { category: "饮品", cycle: "weekly", limit: 80 },
    { category: "社交", cycle: "weekly", limit: 180 }
  ],
  riskProfile: {
    knowledgeLevel: "beginner",
    tolerance: "low",
    experience: []
  },
  investmentProfile: {
    purpose: ["目标储蓄", "财商培养"],
    assetInterest: ["低风险理财"],
    riskPreferenceLabel: "保守型",
    maxDrawdownTolerance: "不愿本金明显波动",
    holdingPeriod: "6个月内",
    reactionToLoss: "会先暂停并确认是否影响生活费",
    decisionStyle: "先安排生活费和目标金",
    riskPreferenceStatus: "known",
    lastUpdatedFrom: "demo_preset"
  },
  behaviorPatterns: ["周五常和朋友出去玩", "下午容易买饮品", "餐饮和饮品支出偏高"],
  profileSource: "demo_xiaochen",
  updatedAt: new Date().toISOString()
};

export const xiaozhouProfile = {
  name: "小周",
  stage: "idle_money_trial",
  grade: "大四",
  schoolLife: "准备实习，开始关注同学和社媒上的低风险理财讨论",
  monthlyIncome: 3300,
  incomeSources: ["生活费", "实习补贴", "奖学金结余"],
  extraIncome: [{ source: "奖学金/实习补贴结余", amount: 2000, stability: "one_off" }],
  fixedExpenses: [
    { name: "交通", amount: 180 },
    { name: "通讯", amount: 60 },
    { name: "求职准备", amount: 160 }
  ],
  safetyBuffer: 600,
  idleMoney: 1000,
  coachStyle: "gentle",
  primaryGoal: "先判断闲钱属性，再学习低风险理财品类",
  reminderCadence: "light",
  categoryLimits: [
    { category: "餐饮", cycle: "weekly", limit: 520 },
    { category: "社交", cycle: "weekly", limit: 260 },
    { category: "学习", cycle: "weekly", limit: 220 }
  ],
  riskProfile: {
    knowledgeLevel: "curious_beginner",
    tolerance: "low_to_medium",
    experience: ["余额宝", "听同学聊过货币基金"]
  },
  investmentProfile: {
    purpose: ["学习探索"],
    assetInterest: ["低风险理财", "货币基金", "现金管理类"],
    riskPreferenceLabel: "稳健探索型",
    maxDrawdownTolerance: "5%以内更安心",
    holdingPeriod: "1-3个月",
    reactionToLoss: "容易受同学分享影响，需要先降温",
    decisionStyle: "容易受同学影响",
    riskPreferenceStatus: "needs_probe",
    lastUpdatedFrom: "demo_preset"
  },
  behaviorPatterns: ["会看同学和社媒分享", "担心错过低风险理财机会", "对风险等级理解模糊"],
  profileSource: "demo_xiaozhou",
  updatedAt: new Date().toISOString()
};

export const xiaolinProfile = {
  name: "小林",
  stage: "risk_calibration",
  grade: "大三",
  schoolLife: "已有稳定实习，生活费和可支配资金更宽裕",
  monthlyIncome: 5200,
  incomeSources: ["生活费", "实习补贴", "家庭支持"],
  extraIncome: [{ source: "实习补贴", amount: 1800, stability: "monthly" }],
  fixedExpenses: [
    { name: "交通", amount: 260 },
    { name: "通讯", amount: 80 },
    { name: "学习/证书", amount: 300 }
  ],
  safetyBuffer: 1000,
  idleMoney: 1800,
  coachStyle: "direct_gentle",
  primaryGoal: "校准已有理财经验里的流动性、回撤和集中度风险",
  reminderCadence: "light",
  categoryLimits: [
    { category: "餐饮", cycle: "weekly", limit: 700 },
    { category: "社交", cycle: "weekly", limit: 420 },
    { category: "学习", cycle: "weekly", limit: 320 }
  ],
  riskProfile: {
    knowledgeLevel: "has_experience",
    tolerance: "medium",
    experience: ["货币基金", "定期", "现金管理类", "基金定投"]
  },
  investmentProfile: {
    purpose: ["学习探索", "长期配置"],
    assetInterest: ["基金", "指数基金", "A股"],
    riskPreferenceLabel: "成长试水型",
    maxDrawdownTolerance: "10%左右需要复盘",
    holdingPeriod: "6个月以上",
    reactionToLoss: "会焦虑但愿意先复盘",
    decisionStyle: "关注历史收益，需要补回撤和集中度视角",
    riskPreferenceStatus: "needs_probe",
    lastUpdatedFrom: "demo_preset"
  },
  behaviorPatterns: ["会看历史收益", "容易忽略回撤和流动性", "可能把短期不用的钱当成长闲钱"],
  profileSource: "demo_xiaolin",
  updatedAt: new Date().toISOString()
};

export const demoPersonas = {
  xiaochen: {
    id: "xiaochen",
    name: "小陈",
    profile: xiaochenProfile,
    grade: "大二",
    monthlyIncome: 2500,
    safetyBuffer: 300,
    defaultGoal: "控制餐饮和饮品消费，月底留住安全垫",
    onboardingHint: "小陈适合体验基础资金安排：生活费 2500 元，关注餐饮、饮品和周五社交支出。"
  },
  xiaozhou: {
    id: "xiaozhou",
    name: "小周",
    profile: xiaozhouProfile,
    grade: "大四",
    monthlyIncome: 3300,
    safetyBuffer: 600,
    defaultGoal: "判断 1000 元闲钱是否适合低风险理财学习",
    onboardingHint: "小周适合体验闲钱试水：有一点结余，想了解低风险理财，也会受同学分享影响。"
  },
  xiaolin: {
    id: "xiaolin",
    name: "小林",
    profile: xiaolinProfile,
    grade: "大三",
    monthlyIncome: 5200,
    safetyBuffer: 1000,
    defaultGoal: "校准已有理财经验里的风险、流动性和集中度",
    onboardingHint: "小林适合体验进阶风险校准：资金更宽裕，买过一些理财/基金，需要补风险视角。"
  }
};

export const xiaochenMemories = [
  {
    memoryId: "demo_mem_friday",
    type: "recurring_event",
    label: "周五常有社交餐饮",
    content: "用户周五晚上可能有社交餐饮支出，预算建议提前预留一点空间。",
    source: "demo_persona",
    confidence: 0.82,
    status: "active",
    privacyLevel: "normal",
    relatedCategories: ["餐饮", "社交"],
    schedule: { dayOfWeek: "Friday", timeRange: "evening" },
    usePolicy: "只用于预算预留，不提具体关系细节"
  },
  {
    memoryId: "demo_mem_drink",
    type: "behavior_pattern",
    label: "下午容易买饮品",
    content: "用户下午容易出现饮品消费，适合轻提醒控制频次。",
    source: "demo_persona",
    confidence: 0.74,
    status: "active",
    privacyLevel: "normal",
    relatedCategories: ["饮品"],
    schedule: { dayOfWeek: "any", timeRange: "afternoon" },
    usePolicy: "用于饮品预算轻提醒"
  }
];

export const presetMemories = {
  xiaochen: xiaochenMemories,
  xiaozhou: [
    {
      memoryId: "demo_mem_fomo",
      type: "behavior_pattern",
      label: "容易受同学理财分享影响",
      content: "用户看到同学讨论低风险理财时，容易担心错过机会，适合先做适当性判断。",
      source: "demo_persona",
      confidence: 0.78,
      status: "active",
      privacyLevel: "normal",
      relatedCategories: ["低风险理财", "跟风判断"],
      schedule: {},
      usePolicy: "只用于跟风降温和风险提醒"
    }
  ],
  xiaolin: [
    {
      memoryId: "demo_mem_experience",
      type: "risk_pattern",
      label: "已有理财经验但需校准风险",
      content: "用户有货币基金、定期、现金管理类和基金定投经验，回答时应少做入门科普，多提醒回撤、流动性和集中度。",
      source: "demo_persona",
      confidence: 0.84,
      status: "active",
      privacyLevel: "normal",
      relatedCategories: ["风险校准", "理财经验"],
      schedule: {},
      usePolicy: "只用于适当性和风险校准"
    }
  ]
};

export const xiaochenTransactions = [
  {
    id: "txn_001",
    amount: 12,
    direction: "expense",
    category: "饮品",
    merchant: "校园奶茶",
    note: "下午奶茶",
    source: "bill_api",
    occurredAt: `${today}T14:10:00+08:00`,
    confidence: 0.88
  },
  {
    id: "txn_002",
    amount: 16,
    direction: "expense",
    category: "餐饮",
    merchant: "学校食堂",
    note: "午饭",
    source: "manual",
    occurredAt: `${today}T12:20:00+08:00`,
    confidence: 0.94
  },
  {
    id: "txn_003",
    amount: 10,
    direction: "expense",
    category: "学习",
    merchant: "打印店",
    note: "复习资料打印",
    source: "bill_api",
    occurredAt: `${today}T09:40:00+08:00`,
    confidence: 0.91
  },
  {
    id: "txn_004",
    amount: 38,
    direction: "expense",
    category: "餐饮",
    merchant: "外卖",
    note: "昨天晚饭",
    source: "bill_api",
    occurredAt: daysAgo(1),
    confidence: 0.86
  },
  {
    id: "txn_005",
    amount: 24,
    direction: "expense",
    category: "饮品",
    merchant: "咖啡店",
    note: "小组作业咖啡",
    source: "bill_api",
    occurredAt: daysAgo(2),
    confidence: 0.82
  },
  {
    id: "txn_006",
    amount: 68,
    direction: "expense",
    category: "社交",
    merchant: "同学聚餐",
    note: "周初聚餐",
    source: "bill_api",
    occurredAt: daysAgo(3),
    confidence: 0.9
  }
];

export const presetTransactions = {
  xiaochen: xiaochenTransactions,
  xiaozhou: [
    {
      id: "zhou_txn_001",
      amount: 22,
      direction: "expense",
      category: "餐饮",
      merchant: "学校食堂",
      note: "午饭",
      source: "bill_api",
      occurredAt: `${today}T12:15:00+08:00`,
      confidence: 0.9
    },
    {
      id: "zhou_txn_002",
      amount: 35,
      direction: "expense",
      category: "学习",
      merchant: "打印店",
      note: "简历打印和材料",
      source: "bill_api",
      occurredAt: `${today}T10:20:00+08:00`,
      confidence: 0.88
    },
    {
      id: "zhou_txn_003",
      amount: 56,
      direction: "expense",
      category: "社交",
      merchant: "同学聚餐",
      note: "实习交流聚餐",
      source: "bill_api",
      occurredAt: daysAgo(2),
      confidence: 0.86
    }
  ],
  xiaolin: [
    {
      id: "lin_txn_001",
      amount: 36,
      direction: "expense",
      category: "餐饮",
      merchant: "咖啡简餐",
      note: "实习日午餐",
      source: "bill_api",
      occurredAt: `${today}T12:40:00+08:00`,
      confidence: 0.9
    },
    {
      id: "lin_txn_002",
      amount: 128,
      direction: "expense",
      category: "学习",
      merchant: "在线课程",
      note: "证书课程",
      source: "bill_api",
      occurredAt: daysAgo(1),
      confidence: 0.85
    },
    {
      id: "lin_txn_003",
      amount: 96,
      direction: "expense",
      category: "社交",
      merchant: "朋友聚餐",
      note: "周末聚餐",
      source: "bill_api",
      occurredAt: daysAgo(3),
      confidence: 0.87
    }
  ]
};

export const demoPersonaFixtures = {
  xiaochen: {
    ...demoPersonas.xiaochen,
    memories: presetMemories.xiaochen,
    transactions: presetTransactions.xiaochen
  },
  xiaozhou: {
    ...demoPersonas.xiaozhou,
    memories: presetMemories.xiaozhou,
    transactions: presetTransactions.xiaozhou
  },
  xiaolin: {
    ...demoPersonas.xiaolin,
    memories: presetMemories.xiaolin,
    transactions: presetTransactions.xiaolin
  }
};

export const knowledgeSnippets = [
  {
    title: "低风险不等于无风险",
    source: "simulated_rag:risk_disclosure",
    keywords: ["低风险", "风险", "R1", "R2", "理财"],
    content: "低风险产品仍可能存在收益波动、流动性限制和费用，历史表现不代表未来表现。"
  },
  {
    title: "风险等级是理解产品的入口",
    source: "simulated_rag:risk_level",
    keywords: ["R1", "R2", "风险等级", "等级"],
    content: "R1/R2 是理财产品常见的风险等级标签，通常代表较低风险，但仍需结合期限、流动性、费用和自身风险承受能力判断。"
  },
  {
    title: "先留安全垫再谈理财",
    source: "simulated_rag:suitability",
    keywords: ["闲钱", "适合", "能不能理财", "1000"],
    content: "入门用户应先确认应急金和未来 30 天必要支出，再决定是否用少量闲钱了解低风险品类。"
  },
  {
    title: "已有经验也要校准风险",
    source: "simulated_rag:risk_calibration",
    keywords: ["基金", "多配", "收益", "回撤", "定投", "指数"],
    content: "已有理财经验的学生更需要关注回撤承受、期限错配、资金集中度和是否误用生活费。"
  },
  {
    title: "高波动资产先做适当性判断",
    source: "simulated_rag:investment_decision",
    keywords: ["A股", "股票", "黄金", "买入", "配置", "加仓", "卖出"],
    content: "A股、股票、黄金和部分基金属于波动更明显的资产，讨论前应先确认理财目的、资金属性、持有周期、回撤承受和适当性，不直接给买卖建议。"
  },
  {
    title: "目标储蓄不宜承接高波动",
    source: "simulated_rag:goal_saving",
    keywords: ["半年后", "换手机", "旅游", "攒钱", "目标储蓄"],
    content: "半年内明确要用的钱应优先考虑流动性和安全性，高波动资产不适合直接承接短期目标金。"
  },
  {
    title: "不做具体产品推荐",
    source: "simulated_rag:product_boundary",
    keywords: ["推荐", "产品", "买哪个", "收益最高"],
    content: "小招只做品类级认知和风险提示，不提供具体产品购买建议或收益承诺。"
  },
  {
    title: "理财意图五分流",
    source: "simulated_rag:investment_intent_router_v23",
    keywords: ["A股", "股票", "基金", "黄金", "定投", "加仓", "买入", "卖出", "跟风", "赚快钱", "攒钱", "换手机"],
    content: "理财动作先分流为学习探索、财商培养、目标储蓄、跟风怕错过、赚快钱，再判断资产类型、资金属性和风险红旗。"
  },
  {
    title: "风险偏好三问一测",
    source: "simulated_rag:risk_preference_probe_v23",
    keywords: ["风险偏好", "多久不用", "下跌", "亏损", "卖出", "补仓", "持有"],
    content: "风险偏好先问资金多久不用、能接受多大短期下跌、亏损时会持有补仓还是卖出，再给保守型、稳健探索型、成长试水型或波动敏感型标签。"
  },
  {
    title: "权益类高波动资产适当性",
    source: "simulated_rag:high_volatility_asset_v23",
    keywords: ["A股", "股票", "高波动", "权益", "回撤", "集中度"],
    content: "A股等高波动资产应先确认理财目的、资金属性、持有周期和回撤承受，不给买卖建议、个股建议或收益预期。"
  },
  {
    title: "短期目标储蓄不承接高波动",
    source: "simulated_rag:goal_saving_v23",
    keywords: ["半年", "换手机", "旅游", "目标储蓄", "攒钱"],
    content: "有明确期限的短期目标应优先考虑安全性、流动性和目标金分桶，不应用高波动资产承接。"
  }
];

export const categoryKeywords = {
  餐饮: ["饭", "午饭", "晚饭", "早饭", "外卖", "食堂", "餐", "面", "米线", "饮食", "吃"],
  饮品: ["奶茶", "咖啡", "饮料", "果茶", "茶"],
  交通: ["地铁", "公交", "打车", "车费", "交通"],
  学习: ["书", "资料", "打印", "课程", "考试", "报名"],
  社交: ["聚餐", "电影", "唱歌", "生日", "礼物", "朋友"],
  网购: ["淘宝", "京东", "拼多多", "快递", "网购"],
  娱乐: ["游戏", "会员", "音乐", "视频"]
};
