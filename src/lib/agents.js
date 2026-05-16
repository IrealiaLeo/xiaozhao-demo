import { demoPersonas, demoUserId } from "./mockData";
import {
  applyPresetPersona,
  createTransaction,
  getSessionMemory,
  getStore,
  getUser,
  injectPersona,
  listTransactions,
  updateProfile,
  updateTransaction
} from "./store";
import {
  assessDataQuality,
  calculateBudget,
  classifyText,
  getDateRange,
  parseAmount,
  summarizeTransactions
} from "./finance";
import { assessSuitability, knowledgeSearch } from "./knowledge";
import { detectMemoryCandidate, getRelevantPersonaMemory, handleMemoryIntent } from "./memory";
import { planCompanionNudge } from "./companion";

const defaultActions = [
  { label: "安排今天的消费", query: "帮我看看今天的消费空间" },
  { label: "先建立画像", query: "每个月生活费2500元，安全垫300元，我想关注餐饮消费" }
];

const presetAliases = [
  { id: "xiaozhou", regex: /小周|xiaozhou/iu },
  { id: "xiaolin", regex: /小林|xiaolin/iu },
  { id: "xiaochen", regex: /小陈|xiaochen|默认画像|示例身份|示例画像|预设/iu }
];

function normalizePresetId(value) {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  if (["xiaochen", "chen", "小陈"].includes(text)) return "xiaochen";
  if (["xiaozhou", "zhou", "小周"].includes(text)) return "xiaozhou";
  if (["xiaolin", "lin", "小林"].includes(text)) return "xiaolin";
  return demoPersonas[text] ? text : null;
}

function detectPresetId(text, fallback = null) {
  for (const item of presetAliases) {
    if (item.regex.test(text)) return item.id;
  }
  return fallback;
}

function uniqueList(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function detectAssetType(text) {
  if (/A\s*股|a\s*股|股票|个股|炒股|入市|二级市场/i.test(text)) return "A股";
  if (/指数基金|ETF/i.test(text)) return "指数基金";
  if (/基金|定投|加仓|补仓/.test(text)) return "基金";
  if (/黄金|金价|金条|积存金/.test(text)) return "黄金";
  if (/货币基金|现金管理|存款|低风险理财|理财产品/.test(text)) return "低风险理财";
  return "unknown";
}

function detectInvestmentPurpose(text) {
  if (/同学.*(买|投)|大家.*(买|投)|不买.*亏|错过|跟风|怕.*错过/.test(text)) return "跟风怕错过";
  if (/赚快钱|赚一笔|收益越高越好|翻倍|暴富|短期.*收益|高收益/.test(text)) return "赚快钱";
  if (/半年后|6\s*个?月后|换.*手机|买.*手机|旅游|旅行|攒钱|目标储蓄|目标金/.test(text)) return "目标储蓄";
  if (/长期资产配置|长期配置|配置思路|持仓结构|资产配置|长期持有/.test(text)) return "长期配置";
  if (/系统.*学|财商|风险等级|R1|R2|了解.*风险|学习.*理财/.test(text)) return "财商培养";
  if (/学习|了解|试试|看看|模拟|入门|研究/.test(text)) return "学习探索";
  return "unknown";
}

function detectInvestmentContext(query, profile = {}, sessionMemory = null) {
  const sessionText = `${sessionMemory?.summary || ""} ${(sessionMemory?.turns || [])
    .map((turn) => `${turn.userQuery} ${turn.assistantBrief}`)
    .join(" ")}`;
  const assetType = detectAssetType(query);
  const rawPurpose = detectInvestmentPurpose(query);
  const sessionPurpose = detectInvestmentPurpose(sessionText);
  const explicitGoalFollowup =
    /这笔钱|目标金|单独规划|单独管理|每月存|怎么存|规划/.test(query) &&
    /目标储蓄|目标金|换手机|目标金额/.test(sessionText);
  const shouldInheritPurpose =
    rawPurpose === "unknown" &&
    sessionPurpose !== "unknown" &&
    !explicitGoalFollowup &&
    !(assetType !== "unknown" && /我想|我打算|考虑|怎么看|建议/.test(query) && !/这笔钱|目标金|单独/.test(query)) &&
    (
      query.trim().length <= 16 ||
      /^(这笔钱|目标金|单独|请先|帮我|继续|那|这个|好|嗯|可以|先|回答|给我|看)/.test(query.trim()) ||
      (/这笔钱|目标金|单独规划|单独管理|每月存|怎么存/.test(query) && /基金投资|理财|目标储蓄|目标金/.test(sessionText))
    );
  const purpose = explicitGoalFollowup ? "目标储蓄" : shouldInheritPurpose ? sessionPurpose : rawPurpose;
  const hasAsset = assetType !== "unknown";
  const hasAction =
    /(想|要不要|能不能|可以|准备|打算|适合|该不该).{0,8}(买|投|定投|配置|加仓|补仓|卖|换|入场|入市)|买入|卖出|加仓|补仓|多配|定投|配置/.test(query);
  const hasInvestmentWord = /理财|投资|收益|回撤|风险|资产|基金|股票|A\s*股|a\s*股|黄金/i.test(query);
  const isPortfolioFollowup = /长期资产配置|长期配置|配置思路|持仓结构|资产配置|投向|仓位|分散|集中度|长期持有/.test(query);
  const isGoalFollowup =
    explicitGoalFollowup ||
    (/这笔钱|目标金|单独规划|单独管理|规划|记录第一笔|攒够|换手机|每月存|怎么存/.test(query) &&
      /目标储蓄|目标金|换手机|基金投资|理财/.test(sessionText));
  const isInvestmentAction =
    hasAsset ||
    isPortfolioFollowup ||
    isGoalFollowup ||
    (purpose === "目标储蓄" && /基金投资|理财|目标储蓄|目标金|目标金额|换手机/.test(sessionText + query)) ||
    (hasAction && hasInvestmentWord);
  const riskFlag = /30\s*天.*8%|8%.*30\s*天|转账.*群|进群|内部机会|借钱.*(投|买)|贷款.*(投|买)|保本高收益|稳赚|私下转账|赚快钱|收益越高越好/.test(query);
  const investmentProfile = profile.investmentProfile || {};

  return {
    isInvestmentAction,
    assetType,
    purpose,
    riskFlag,
    personaStage: profile.stage || "unknown",
    riskPreferenceStatus: investmentProfile.riskPreferenceStatus || (investmentProfile.riskPreferenceLabel ? "known" : "needs_probe"),
    riskPreferenceLabel: investmentProfile.riskPreferenceLabel || "",
    holdingPeriod: investmentProfile.holdingPeriod || "",
    maxDrawdownTolerance: investmentProfile.maxDrawdownTolerance || "",
    reactionToLoss: investmentProfile.reactionToLoss || ""
  };
}

function looksLikePersonaUpdate(text) {
  return (
    /(生活费|月收入|收入|可支配|安全垫|应急金|备用金|固定支出|兼职|奖学金|叫我|我叫|我是|名字|大一|大二|大三|大四|研一|研二|研三|提醒|关注|目标|小目标|预算|风险偏好|保守|激进|买过|基金|闲钱|半年后|换.*手机|攒钱)/.test(text) &&
    /(改|修改|调整|设|设置|设成|改成|换成|关注|不关注|叫我|我叫|我是|每月|每个月|月生活费|安全垫|不超过|控制在)/.test(text)
  );
}

function routeByRules(query, options = {}) {
  const text = query.trim();
  const currentProfile = options.profile || options.persona || {};
  const sessionMemory = options.sessionMemory || null;
  const injectedPreset = normalizePresetId(options.personaPreset || options.presetId || options.preset);
  const presetId = detectPresetId(text, injectedPreset);
  if (presetId && /小陈|小周|小林|xiaochen|xiaozhou|xiaolin|默认画像|示例身份|示例画像|预设|切换|换成|使用|用/.test(text)) {
    return {
      intent: "use_demo_persona",
      capability: "capability_1",
      confidence: 0.95,
      reason: "用户选择预设画像",
      presetId
    };
  }
  if (/记住|以后帮我预留|可以保存/.test(text)) {
    return { intent: "memory_confirm", capability: "capability_1", confidence: 0.86, reason: "用户同意保存记忆" };
  }
  if (/不用记|别记录|不要保存|这是巧合/.test(text)) {
    return { intent: "memory_reject", capability: "capability_1", confidence: 0.84, reason: "用户拒绝保存记忆" };
  }
  if (/你记住了什么|查看记忆|删除.*记忆|删掉.*记忆|忘掉/.test(text)) {
    return { intent: "memory_list", capability: "capability_1", confidence: 0.86, reason: "用户查看或管理记忆" };
  }
  if (/30\s*天.*8%|8%.*30\s*天|转账.*群|进群|内部机会|借钱.*(投|买)|贷款.*(投|买)|保本高收益|稳赚|私下转账/.test(text)) {
    return { intent: "risk_radar", capability: "capability_3", confidence: 0.97, reason: "命中金融风险红旗" };
  }
  const personaPatch = extractPersonaPatch(text, currentProfile);
  const hasExplicitProfilePatch =
    looksLikePersonaUpdate(text) &&
    Object.keys(personaPatch).some((key) => !["riskProfile", "investmentProfile", "stage", "profileSource"].includes(key));
  if (hasExplicitProfilePatch) {
    return { intent: "goal_update", capability: "capability_1", confidence: 0.91, reason: "用户明确补充生活费、收入或目标储蓄画像" };
  }
  const investmentContext = detectInvestmentContext(text, currentProfile, sessionMemory);
  if (investmentContext.isInvestmentAction) {
    return {
      intent: investmentContext.riskFlag ? "risk_radar" : "investment_decision_guidance",
      capability: "capability_3",
      confidence: investmentContext.riskFlag ? 0.97 : 0.93,
      reason: investmentContext.riskFlag ? "命中理财风险红旗" : "用户表达理财动作或资产意向，优先进入理财决策陪伴",
      investmentContext
    };
  }
  if (/推荐.*产品|买哪个|收益最高|具体产品|保本高收益/.test(text)) {
    return { intent: "restricted_recommendation", capability: "capability_3", confidence: 0.9, reason: "用户要求具体产品推荐或收益承诺" };
  }
  if (/同学.*(买|投)|大家.*(买|投)|不买.*亏|错过|跟风|收益焦虑/.test(text)) {
    return { intent: "peer_pressure_check", capability: "capability_3", confidence: 0.9, reason: "用户出现跟风或错过焦虑" };
  }
  if (/买过.*基金|之前.*基金|定投|指数基金|多配|加仓|换个.*高|回撤|收益不太行|生活费.*充裕/.test(text)) {
    return { intent: "advanced_risk_calibration", capability: "capability_3", confidence: 0.88, reason: "用户已有理财经验，需要风险校准" };
  }
  if (/R1|R2|低风险|风险等级|货币基金|存款|现金管理/.test(text)) {
    return { intent: "low_risk_learning", capability: "capability_3", confidence: 0.86, reason: "用户询问入门理财概念" };
  }
  if (/闲钱|能不能理财|适不适合|可以买理财|开始理财|基金定投/.test(text)) {
    return { intent: "suitability_check", capability: "capability_3", confidence: 0.87, reason: "用户询问理财适配" };
  }
  if (/区别|对比|哪个好|怎么选/.test(text) && /存款|货币基金|现金管理|理财/.test(text)) {
    return { intent: "category_compare", capability: "capability_3", confidence: 0.84, reason: "用户询问品类对比" };
  }
  if (/补|记一笔|花了|消费了|买了|支付/.test(text) && parseAmount(text)) {
    return { intent: "add_transaction", capability: "capability_2", confidence: 0.82, reason: "用户补记消费" };
  }
  if (looksLikePersonaUpdate(text) && Object.keys(personaPatch).length) {
    return { intent: "goal_update", capability: "capability_1", confidence: 0.9, reason: "用户自然语言修改 persona" };
  }
  if (/改|修改|不是|删|删除|分类/.test(text)) {
    return { intent: "edit_transaction", capability: "capability_2", confidence: 0.75, reason: "用户修正账单" };
  }
  if (/今天|消费空间|还能|可花|能不能|外卖|奶茶|买/.test(text)) {
    return { intent: "today_budget", capability: "capability_2", confidence: 0.84, reason: "用户询问今天消费决策" };
  }
  if (/本周|这个月|月度|周度|花哪|统计|复盘/.test(text)) {
    return { intent: "spending_stats", capability: "capability_2", confidence: 0.8, reason: "用户询问消费统计" };
  }
  if (/目标|安全垫|预算|生活费|提醒|月底|开始|画像|设定|关注.*消费/.test(text)) {
    return { intent: "goal_setup", capability: "capability_1", confidence: 0.88, reason: "用户设置目标或画像" };
  }
  if (/临时聚餐|必要支出|冲动消费|这笔/.test(text)) {
    return { intent: "companion_nudge_response", capability: "capability_2", confidence: 0.72, reason: "用户回应提醒" };
  }
  return { intent: "fallback", capability: "fallback", confidence: 0.55, reason: "未命中核心能力" };
}

export async function routeIntent(query, options = {}) {
  return routeByRules(query, options);
}

function capabilityFor(intent) {
  if (["use_demo_persona", "goal_setup", "goal_update", "memory_confirm", "memory_reject", "memory_list"].includes(intent)) {
    return "capability_1";
  }
  if (["today_budget", "add_transaction", "edit_transaction", "spending_stats", "companion_nudge_response"].includes(intent)) {
    return "capability_2";
  }
  if (["low_risk_learning", "suitability_check", "category_compare", "investment_decision_guidance", "restricted_recommendation", "peer_pressure_check", "advanced_risk_calibration", "risk_radar"].includes(intent)) {
    return "capability_3";
  }
  return "fallback";
}

function capabilityNameFor(intent) {
  return {
    capability_1: "资金分桶与理财画像",
    capability_2: "动态现金流与配置守望",
    capability_3: "理财决策陪伴与风险校准",
    fallback: "兜底引导"
  }[capabilityFor(intent)];
}

function amountAfter(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^\\d]{0,8}(\\d+(?:\\.\\d+)?)\\s*(元|块)?`);
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function inferFocusCategories(query) {
  const categories = [];
  const checks = [
    ["餐饮", /餐饮|饮食|吃饭|外卖|食堂|饭/],
    ["饮品", /奶茶|咖啡|饮料|饮品/],
    ["社交", /聚餐|朋友|电影|唱歌|社交/],
    ["网购", /网购|淘宝|京东|快递/],
    ["学习", /学习|书|资料|课程|考试/],
    ["交通", /交通|地铁|公交|打车|通勤|车费/],
    ["娱乐", /娱乐|游戏|会员|音乐|视频/]
  ];
  for (const [category, regex] of checks) {
    if (regex.test(query)) categories.push(category);
  }
  return categories;
}

function upsertCategoryLimit(existing = [], category, limit) {
  const next = existing.filter((item) => item.category !== category);
  next.push({ category, cycle: "weekly", limit });
  return next;
}

function extractPersonaPatch(query, oldProfile = {}) {
  const patch = {};
  const monthlyIncome = amountAfter(query, ["每个月生活费", "月生活费", "生活费", "月可支配", "可支配", "收入", "预算"]);
  const partTimeIncome = amountAfter(query, ["兼职每个月能赚大概", "兼职每个月能赚", "兼职每月能赚", "兼职收入", "兼职"]);
  const safetyBuffer = amountAfter(query, ["安全垫", "应急金", "备用金"]);
  const idleMoney = amountAfter(query, ["闲钱", "结余", "暂时不用"]);
  const fixedExpense = amountAfter(query, ["固定支出"]);
  const focusCategories = inferFocusCategories(query);
  const grade = query.match(/(大一|大二|大三|大四|研一|研二|研三|博士|毕业生)/)?.[1];
  const name = query.match(/(?:叫我|我叫|我是|名字(?:改成|叫|是)?)([\u4e00-\u9fa5A-Za-z0-9_]{1,8})/)?.[1];
  const goal = query.match(/(?:目标|小目标)[^，。,.]{0,8}(?:是|改成|设成|调整为)([^，。,.]{2,30})/)?.[1];
  const phoneGoal = query.match(/(?:半年后|6\s*个?月后|争取半年后)[^，。,.]{0,12}(换|买)(?:个|一部|一个)?手机/)?.[0];

  if (monthlyIncome !== null) patch.monthlyIncome = monthlyIncome;
  if (partTimeIncome !== null) {
    patch.extraIncome = [{ source: "兼职", amount: partTimeIncome, stability: "monthly" }];
  }
  if (safetyBuffer !== null) patch.safetyBuffer = safetyBuffer;
  if (idleMoney !== null) patch.idleMoney = idleMoney;
  if (fixedExpense !== null) patch.fixedExpenses = [{ name: "固定支出", amount: fixedExpense }];
  if (grade) patch.grade = grade;
  if (name && !/大一|大二|大三|大四|研一|研二|研三/.test(name)) patch.name = name;
  if (goal) patch.primaryGoal = goal.trim();
  if (phoneGoal) {
    patch.primaryGoal = "半年后换手机";
    patch.investmentProfile = {
      ...(oldProfile.investmentProfile || {}),
      purpose: uniqueList([...(oldProfile.investmentProfile?.purpose || []), "目标储蓄"]),
      goal: "半年后换手机",
      goalHorizon: "6个月",
      holdingPeriod: "6个月内",
      riskPreferenceStatus: "needs_probe",
      lastUpdatedFrom: "conversation"
    };
  }
  if (/了解.*理财|学习.*理财|理财产品|财商/.test(query)) {
    patch.investmentProfile = {
      ...(oldProfile.investmentProfile || {}),
      ...(patch.investmentProfile || {}),
      purpose: uniqueList([...(oldProfile.investmentProfile?.purpose || []), ...(patch.investmentProfile?.purpose || []), "财商培养"]),
      assetInterest: uniqueList([...(oldProfile.investmentProfile?.assetInterest || []), ...(patch.investmentProfile?.assetInterest || []), "理财产品"]),
      riskPreferenceStatus: patch.investmentProfile?.riskPreferenceStatus || oldProfile.investmentProfile?.riskPreferenceStatus || "needs_probe",
      lastUpdatedFrom: "conversation"
    };
  }
  if (/严格/.test(query)) patch.coachStyle = "strict";
  if (/温和|轻轻|不要太频繁|别太频繁/.test(query)) patch.coachStyle = "gentle";
  if (/少提醒|低频|不要总提醒|别总提醒/.test(query)) patch.reminderCadence = "light";
  if (/每周|周度|正常提醒|该提醒就提醒/.test(query)) patch.reminderCadence = "normal";
  if (/保守|稳一点|风险低一点/.test(query)) {
    patch.riskProfile = { ...(oldProfile.riskProfile || {}), tolerance: "low" };
    patch.investmentProfile = {
      ...(oldProfile.investmentProfile || {}),
      ...(patch.investmentProfile || {}),
      riskPreferenceLabel: "保守型",
      riskPreferenceStatus: "known",
      lastUpdatedFrom: "conversation"
    };
  }
  if (/激进|能接受波动|收益高一点/.test(query)) {
    patch.riskProfile = { ...(oldProfile.riskProfile || {}), tolerance: "medium" };
    patch.investmentProfile = {
      ...(oldProfile.investmentProfile || {}),
      ...(patch.investmentProfile || {}),
      riskPreferenceLabel: "成长试水型",
      riskPreferenceStatus: "known",
      lastUpdatedFrom: "conversation"
    };
  }
  const drawdown = query.match(/(?:亏|下跌|回撤)\s*(\d+(?:\.\d+)?)\s*%/);
  if (drawdown) {
    const percent = `${drawdown[1]}%`;
    patch.investmentProfile = {
      ...(oldProfile.investmentProfile || {}),
      ...(patch.investmentProfile || {}),
      maxDrawdownTolerance: percent,
      riskPreferenceLabel: /睡不着|焦虑|受不了|马上卖/.test(query) ? "波动敏感型" : patch.investmentProfile?.riskPreferenceLabel || oldProfile.investmentProfile?.riskPreferenceLabel || "",
      riskPreferenceStatus: "known",
      lastUpdatedFrom: "conversation"
    };
  }
  const experiences = [];
  for (const [label, regex] of [
    ["货币基金", /货币基金/],
    ["基金", /基金/],
    ["基金定投", /定投/],
    ["指数基金", /指数基金/],
    ["定期", /定期/],
    ["现金管理类", /现金管理/]
  ]) {
    if (regex.test(query)) experiences.push(label);
  }
  if (/买过|投过|持有|接触过/.test(query) && experiences.length) {
    const oldExp = oldProfile.riskProfile?.experience || [];
    patch.riskProfile = {
      ...(oldProfile.riskProfile || {}),
      knowledgeLevel: "has_experience",
      experience: Array.from(new Set([...oldExp, ...experiences]))
    };
    patch.stage = "risk_calibration";
  }
  const assetType = detectAssetType(query);
  if (assetType !== "unknown") {
    patch.investmentProfile = {
      ...(oldProfile.investmentProfile || {}),
      ...(patch.investmentProfile || {}),
      assetInterest: uniqueList([...(oldProfile.investmentProfile?.assetInterest || []), ...(patch.investmentProfile?.assetInterest || []), assetType]),
      lastUpdatedFrom: "conversation"
    };
  }
  if (focusCategories.length) {
    patch.categoryLimits = focusCategories.map((category) => ({
      category,
      cycle: "weekly",
      limit: category === "饮品" ? 80 : category === "餐饮" ? 460 : 180
    }));
    patch.primaryGoal = `控制${focusCategories.join("、")}消费`;
  }
  for (const match of query.matchAll(/(餐饮|饮品|社交|交通|学习|网购|娱乐)[^0-9]{0,8}(?:不超过|控制在|预算|上限)[^0-9]{0,4}(\d+(?:\.\d+)?)\s*(?:元|块)?/g)) {
    patch.categoryLimits = upsertCategoryLimit(patch.categoryLimits || oldProfile.categoryLimits || [], match[1], Number(match[2]));
    patch.primaryGoal = patch.primaryGoal || `控制${match[1]}消费`;
  }
  for (const category of inferFocusCategories(query.replace(/不关注|不用关注|别关注/g, ""))) {
    if (new RegExp(`不关注${category}|不用关注${category}|别关注${category}`).test(query)) {
      patch.categoryLimits = (patch.categoryLimits || oldProfile.categoryLimits || []).filter((item) => item.category !== category);
    }
  }
  if (/月底不吃土/.test(query)) patch.primaryGoal = "月底不吃土";
  if (!patch.primaryGoal && (patch.monthlyIncome || patch.safetyBuffer)) {
    patch.primaryGoal = oldProfile.primaryGoal || "先把生活费节奏稳住";
  }
  if (Object.keys(patch).length) patch.profileSource = oldProfile.profileSource === "empty" ? "user_natural_language" : oldProfile.profileSource || "user_natural_language";
  return patch;
}

function validateGoalPatch(patch) {
  const warnings = [];
  if (patch.monthlyIncome && patch.safetyBuffer && patch.safetyBuffer > patch.monthlyIncome) {
    warnings.push("安全垫比月生活费还高，建议再确认一次金额。");
    delete patch.safetyBuffer;
  }
  return { patch, warnings };
}

function buildGoalCard(profile) {
  return {
    type: "goal_setup_card",
    title: "资金分桶卡",
    name: profile.name,
    grade: profile.grade,
    stage: profile.stage,
    primaryGoal: profile.primaryGoal || "先建立清晰画像",
    monthlyIncome: profile.monthlyIncome || 0,
    safetyBuffer: profile.safetyBuffer || 0,
    idleMoney: profile.idleMoney || 0,
    focusCategories: (profile.categoryLimits || []).slice(0, 3).map((item) => item.category),
    coachStyle: profile.coachStyle === "strict" ? "严格提醒" : "温和提醒",
    reminderCadence: profile.reminderCadence || "light"
  };
}

function snapshotFor(userId, extra = {}) {
  const user = getUser(userId);
  const todayRange = getDateRange("today");
  const weekRange = getDateRange("week");
  const monthRange = getDateRange("month");
  const todayTransactions = listTransactions(userId, todayRange);
  const weekTransactions = listTransactions(userId, weekRange);
  const monthTransactions = listTransactions(userId, monthRange);
  const budget =
    user.profile.monthlyIncome || todayTransactions.length
      ? calculateBudget({ profile: user.profile, todayTransactions, weekTransactions })
      : null;

  return {
    profile: { ...user.profile, name: user.name },
    budget,
    stats: {
      day: summarizeTransactions(todayTransactions),
      week: summarizeTransactions(weekTransactions),
      month: summarizeTransactions(monthTransactions)
    },
    personaMemories: getRelevantPersonaMemory({ userId, intent: extra.intent, category: extra.category })
  };
}

function profileReady(profile) {
  return Boolean(profile.monthlyIncome && profile.safetyBuffer !== null && profile.safetyBuffer !== undefined);
}

export async function runGoalAgent(query, userId = demoUserId, intent = "goal_setup") {
  if (intent === "use_demo_persona") {
    const presetId = detectPresetId(query, "xiaochen");
    const user = applyPresetPersona(userId, presetId);
    const preset = demoPersonas[presetId] || demoPersonas.xiaochen;
    const snapshot = snapshotFor(userId, { intent });
    return {
      reply:
        `已切换到${preset.name}示例身份：每月可支配 ${preset.monthlyIncome} 元，先留 ${preset.safetyBuffer} 元安全垫。这个画像适合体验“${preset.defaultGoal}”。`,
      card: buildGoalCard({ ...user.profile, name: user.name }),
      actions:
        presetId === "xiaozhou"
          ? [
              { label: "判断闲钱", query: "我有 1000 元闲钱，可以了解低风险理财吗？" },
              { label: "同学都在买", query: "同学都在买，我不买会不会亏？" }
            ]
          : presetId === "xiaolin"
            ? [
                { label: "做风险校准", query: "我之前买过基金，现在生活费比较充裕，要不要多配一点？" },
                { label: "修改月收入", query: "修改我的月收入为4000" }
              ]
            : [
                { label: "安排今天的消费", query: "帮我看看今天的消费空间" },
                { label: "解释低风险理财", query: "低风险理财适合刚入门的大学生了解吗？" }
              ],
      snapshot,
      streamMode: "deterministic"
    };
  }

  const user = getUser(userId);
  const memoryCandidate = detectMemoryCandidate(query);
  if (memoryCandidate) {
    return {
      reply: "我可以把这个当成预算习惯来记，但会先问你确认。这样以后安排周五或周末预算时，我会提前留一点空间。",
      card: {
        type: "memory_confirm_card",
        title: "要记住这个预算习惯吗？",
        memory: memoryCandidate.content,
        relatedCategories: memoryCandidate.relatedCategories
      },
      actions: [
        { label: "记住这个习惯", query: "可以保存，以后帮我预留这类预算" },
        { label: "这次知道就行", query: "不用记，这是这次的情况" }
      ],
      snapshot: snapshotFor(userId, { intent })
    };
  }

  const { patch, warnings } = validateGoalPatch(extractPersonaPatch(query, user.profile));
  const profile = Object.keys(patch).length ? updateProfile(userId, patch) : user.profile;
  const snapshot = snapshotFor(userId, { intent });
  const focus = (profile.categoryLimits || []).map((item) => item.category).join("、") || "日常消费";
  const updatedFields = [];
  if (patch.name) updatedFields.push(`称呼记为${patch.name}`);
  if (patch.monthlyIncome) updatedFields.push(`月生活费 ${patch.monthlyIncome} 元`);
  if (patch.extraIncome?.length) updatedFields.push(`${patch.extraIncome[0].source}收入约 ${patch.extraIncome[0].amount} 元`);
  if (patch.safetyBuffer !== undefined) updatedFields.push(`安全垫 ${patch.safetyBuffer} 元`);
  if (patch.primaryGoal) updatedFields.push(`目标是${patch.primaryGoal}`);
  if (patch.investmentProfile?.purpose?.includes("财商培养")) updatedFields.push("想了解理财产品");
  const reply = Object.keys(patch).length
    ? `${updatedFields.length ? `收到，画像已更新：${updatedFields.join("，")}。` : "收到，画像已更新。"}${patch.investmentProfile?.goalHorizon ? "这个目标有明确期限，先把目标金、安全垫和学习型闲钱分开，不用高波动资产直接承接。" : ""}${profile.safetyBuffer === null || profile.safetyBuffer === undefined ? " 下一步只要再补一个安全垫金额，我就能帮你把分桶做得更稳。" : ""}${warnings[0] || ""}`
    : profileReady(profile)
      ? `收到，画像已更新。你的月生活费按 ${profile.monthlyIncome} 元记，安全垫按 ${profile.safetyBuffer || 0} 元守住，先重点看${focus}。之后我做消费判断时，会先保护这笔安全垫。${warnings[0] || ""}`
      : "我们先把画像补齐一点：你可以告诉我每月生活费、想留多少安全垫，以及最想管住哪类消费。";

  return {
    reply,
    card: buildGoalCard(profile),
    actions: profileReady(profile)
      ? [
          { label: "安排今天的消费", query: "帮我看看今天的消费空间" },
          { label: "补记一笔消费", query: "补一笔 18 元午饭" }
        ]
      : [
          { label: "用小陈示例体验", query: "用小陈的示例身份开始" },
          { label: "输入我的情况", query: "每个月生活费2500元，安全垫300元，我想关注餐饮消费" }
        ],
    snapshot,
    streamMode: Object.keys(patch).length ? "deterministic" : "llm"
  };
}

function getCashflowContext(userId, extra = {}) {
  const profile = getUser(userId).profile;
  const todayRange = getDateRange("today");
  const weekRange = getDateRange("week");
  const monthRange = getDateRange("month");
  const todayTransactions = listTransactions(userId, todayRange);
  const weekTransactions = listTransactions(userId, weekRange);
  const monthTransactions = listTransactions(userId, monthRange);
  const budget = calculateBudget({ profile, todayTransactions, weekTransactions });
  return {
    profile,
    transactions: todayTransactions.slice(0, 8),
    stats: {
      day: summarizeTransactions(todayTransactions),
      week: summarizeTransactions(weekTransactions),
      month: summarizeTransactions(monthTransactions)
    },
    budget,
    dataQuality: assessDataQuality(todayTransactions),
    personaMemories: getRelevantPersonaMemory({ userId, intent: extra.intent || "today_budget", category: extra.category })
  };
}

function buildBudgetCard(context) {
  const { budget, dataQuality } = context;
  const memoryTip = context.personaMemories?.find((memory) => memory.label.includes("周五"));
  return {
    type: "today_budget_card",
    title: "配置守望卡",
    spendableAmount: budget.spendable,
    status: budget.status,
    confidence: dataQuality.level,
    todaySpent: budget.todaySpent,
    warnings: budget.warnings,
    why: budget.why,
    memoryTip: memoryTip ? "你周五通常有社交餐饮，我会提前留一点空间。" : null,
    dataSources: ["账单 API", "用户补记/修正", "persona 画像"],
    missingDataHint: dataQuality.hint,
    suggestions:
      budget.status === "alert"
        ? ["这笔消费会压紧生活费桶，先别动安全垫。", "如果是必要支出，补记后我再帮你重算。"]
        : ["这笔消费目前主要影响生活费桶，还没有动到安全垫。", "想更稳的话，可以少叠加一次饮品或外卖。"]
  };
}

function findTransactionToEdit(userId, query, context) {
  const matched = context.transactions.find((txn) => {
    const haystack = `${txn.merchant}${txn.note}${txn.category}`;
    return ["食堂", "午饭", "奶茶", "外卖", "打印", "交通"].some((word) => query.includes(word) && haystack.includes(word));
  });
  return matched || context.transactions[0] || getStore().transactions.find((txn) => txn.userId === userId);
}

export async function runCashflowAgent(query, userId = demoUserId, intent = "today_budget") {
  const user = getUser(userId);
  if (!profileReady(user.profile)) {
    return {
      reply: "我还不知道你的月生活费和安全垫，直接判断消费空间会有点虚。你可以先告诉我这两个数，或者用小陈示例身份体验。",
      card: buildGoalCard(user.profile),
      actions: [
        { label: "输入我的情况", query: "每个月生活费2500元，安全垫300元，我想关注餐饮消费" },
        { label: "用小陈示例体验", query: "用小陈的示例身份开始" }
      ],
      snapshot: snapshotFor(userId, { intent })
    };
  }

  let latestTransaction = null;
  if (intent === "add_transaction") {
    const amount = parseAmount(query) || 0;
    latestTransaction = createTransaction(userId, {
      amount,
      category: classifyText(query),
      note: query,
      merchant: classifyText(query)
    });
  }

  let context = getCashflowContext(userId, { intent, category: latestTransaction?.category });

  if (intent === "edit_transaction") {
    const txn = findTransactionToEdit(userId, query, context);
    if (txn) {
      const amount = parseAmount(query);
      latestTransaction = updateTransaction(userId, txn.id, {
        amount: amount || txn.amount,
        category: classifyText(query) === "其他" ? txn.category : classifyText(query),
        note: query
      });
      context = getCashflowContext(userId, { intent, category: latestTransaction.category });
    }
  }

  const budgetCard = buildBudgetCard(context);
  const nudge = planCompanionNudge({ budget: context.budget, latestTransaction, memories: context.personaMemories });
  const card = nudge || budgetCard;
  const top = context.stats.week.topCategories[0];
  const reply =
    intent === "add_transaction"
      ? `已补记这笔 ${latestTransaction.amount} 元${latestTransaction.category}，我重新算了一下：今天已确认支出 ${context.budget.todaySpent} 元，当前建议可安排 ${context.budget.spendable} 元左右。`
      : intent === "edit_transaction"
        ? `已按你的修正更新账单。现在今日已确认支出 ${context.budget.todaySpent} 元，建议消费空间约 ${context.budget.spendable} 元。`
        : intent === "spending_stats"
          ? `本周目前花得最多的是${top?.category || "日常消费"}，约 ${Math.round(top?.amount || 0)} 元。今天建议消费空间约 ${context.budget.spendable} 元，我会优先帮你守住安全垫。`
          : `按当前账单和目标看，今天建议消费空间约 ${context.budget.spendable} 元。${budgetCard.memoryTip || ""}`;

  return {
    reply,
    card,
    cards: nudge ? [budgetCard, nudge] : [budgetCard],
    actions: [
      { label: "补记一笔消费", query: "补一笔 18 元午饭" },
      { label: "看本周花在哪", query: "这个星期钱都花哪了？" }
    ],
    snapshot: snapshotFor(userId, { intent, category: latestTransaction?.category })
  };
}

function buildInvestmentGuidance({ query, profile, sessionMemory }) {
  const investmentContext = detectInvestmentContext(query, profile, sessionMemory);
  const sessionText = `${sessionMemory?.summary || ""} ${(sessionMemory?.turns || [])
    .map((turn) => `${turn.userQuery} ${turn.assistantBrief}`)
    .join(" ")}`;
  const stage = profile.stage || "unknown";
  const name = profile.name || "";
  const sessionAssetType = detectAssetType(sessionText);
  const assetType =
    investmentContext.assetType === "unknown" && sessionAssetType !== "unknown"
      ? sessionAssetType
      : investmentContext.assetType === "unknown"
        ? "理财资产"
        : investmentContext.assetType;
  const purpose = investmentContext.purpose;
  const targetAmount = Number((query.match(/(\d{4,6})\s*元/) || sessionText.match(/目标金额约\s*(\d{4,6})\s*元/) || [])[1] || 0);
  const targetMonths = query.includes("半年") || sessionText.includes("目标期限约 6 个月")
    ? 6
    : Number((query.match(/(\d+)\s*个?月后/) || sessionText.match(/目标期限约\s*(\d+)\s*个月/) || [])[1] || 0);
  const monthlyTarget = targetAmount && targetMonths ? Math.ceil(targetAmount / targetMonths) : null;
  const profileIdleMoney = Number(profile.idleMoney || 0);
  const learningOnly = purpose === "财商培养" || /只是想|先学习|不急着买|不急买|暂时不买|模拟|了解/.test(query);
  const longTermAllocation =
    purpose === "长期配置" ||
    /长期资产配置|长期配置|配置思路|持仓结构|资产配置/.test(query) ||
    (/配置|怎么配|怎么投/.test(query) && /长期资产配置|长期配置|配置思路/.test(sessionText));
  const isHighVolatility = /A股|指数基金|基金|黄金/.test(assetType);
  const existingExperience = profile.riskProfile?.experience || [];
  let questions = [
    `你考虑${assetType}，主要是为了学习市场、长期配置、目标储蓄，还是被短期行情吸引？`,
    "这笔钱至少多久不用？",
    "如果短期下跌 10%，你会继续持有、补仓，还是马上卖出？"
  ];
  let steps = ["先确认目的", "再看资金属性", "再测风险承受", "最后决定学习路径"];

  let reply;
  let title = isHighVolatility ? "高波动资产适当性卡" : "理财决策引导卡";
  let stageFocus;
  if (purpose === "目标储蓄" || /目标金|换手机|单独规划|单独管理|每月存|攒够/.test(query)) {
    title = "目标金规划卡";
    stageFocus = "当前要把刚性目标和基金投资分开：目标金优先流动性和确定性，基金学习另开小桶。";
    steps = ["目标金单独成桶", "先保证每月转入", "不用高波动基金承接", "学习金另设小额观察"];
    questions = [
      "这笔钱是否 6 个月后必须使用？",
      "每月固定转入后，生活费和安全垫是否仍然舒服？",
      "基金学习是否可以只用目标金之外的小额资金？"
    ];
    const pressureText =
      monthlyTarget && profileIdleMoney
        ? `按 ${targetAmount} 元 / ${targetMonths} 个月估算，每月约 ${monthlyTarget} 元；如果你每月可长期拿出的空间约 ${profileIdleMoney} 元，目标金会占大头，基金投资就不该从这笔钱里出。`
        : "这笔钱不是基金收益目标，而是有明确使用时间的目标金。";
    reply = `${pressureText} 更合理的拆法是：目标金放在高流动、低波动的位置单独管理；如果还想学基金，再从目标金之外留一小笔学习金观察波动。`;
  } else if (longTermAllocation) {
    title = "长期配置思路卡";
    stageFocus = "当前要尽快收束到配置原则：先守住流动性，再控制波动和集中度，最后再考虑是否进入真实购买。";
    steps = ["先留足不用投的钱", "再确定长期资金", "分散单一方向风险", "真实购买前做正规测评"];
    questions = [
      "这笔长期资金之外，生活费和安全垫是否已经单独留好？",
      "你更担心错过上涨，还是更担心下跌时拿不住？",
      "现有基金是否集中在相似风格或同一类资产上？"
    ];
    reply = `前面已经确认你更偏长期资产配置，这一轮可以直接收束到方案。生活费和安全垫不动，只拿长期不用的钱做配置；基金上先避免都押在一个方向，再用定期复盘控制回撤和集中度。`;
  } else if (learningOnly) {
    title = "理财学习路径卡";
    stageFocus = "当前更适合走学习路径：先理解品类和风险边界，再做模拟观察，暂不进入真实买入决策。";
    steps = ["先分清资产品类", "再看风险来源", "做一段模拟观察", "最后再谈是否适合真实配置"];
    questions = [
      "你更想先学低风险现金管理、基金定投，还是股票市场基础？",
      "这次学习是为了财商培养、长期配置，还是未来某个消费目标？",
      "你希望小招用案例讲解、对比表，还是每天给一个小知识点？"
    ];
    reply = `可以，那这轮先不讨论买不买。${name || "你"}已经有一些理财接触，更适合把${assetType}当成学习对象：先弄清品类、风险从哪来、什么钱不能拿来投，再用模拟观察建立手感。`;
  } else if (stage === "basic_arrangement") {
    stageFocus = "先确认生活费、安全垫和目标金，再把高波动资产当作知识学习，不动生活费。";
    reply = `${assetType}更像理财学习和适当性判断，不是今天饭钱安排。${name || "你"}现在更适合先守住生活费、安全垫和目标金；如果想了解，可以从规则、模拟和小金额学习开始，不急着真实买入。`;
  } else if (stage === "idle_money_trial") {
    stageFocus = "先识别好奇还是跟风，再了解波动、交易规则和模拟学习。";
    reply = `${assetType}不能被包装成低风险试水。我们先判断你是想学习，还是被同学和行情带动；再看这笔钱是不是学习型闲钱、多久不用，以及能不能接受波动。`;
  } else if (stage === "risk_calibration") {
    stageFocus = "进入进阶风险校准：用途、资金属性、持有周期、回撤承受和已有配置集中度。";
    reply = `这更像理财配置判断，不是今天消费安排。以你现在的画像看，你已有${existingExperience.length ? existingExperience.join("、") : "一些理财"}经验，考虑${assetType}要先校准目的、资金属性、持有周期、回撤承受和适当性。`;
  } else {
    stageFocus = "先补齐画像，再判断学习、观望、小金额试水还是明确劝阻。";
    reply = `这属于理财决策陪伴，不是消费预算问题。我不能推荐具体产品或承诺收益，但可以先帮你把目的、资金属性、风险偏好和持有周期问清楚，再判断下一步更适合学习还是观望。`;
  }

  if (purpose === "目标储蓄") title = "目标金规划卡";
  if (purpose === "赚快钱") {
    reply = "“赚快钱”这个方向要先降温。高收益通常对应高风险，小招不会用具体产品或收益预期来刺激购买；更稳的做法是先做风险测评和品类学习。";
    title = "风险偏好探索卡";
  }
  if (purpose === "长期配置") {
    title = "长期配置思路卡";
  }

  return {
    investmentContext: {
      ...investmentContext,
      assetType,
      personaStage: stage,
      purpose,
      riskPreferenceStatus: investmentContext.riskPreferenceStatus || "needs_probe"
    },
    reply,
    card: {
      type: "investment_guidance_card",
      title,
      assetType,
      purpose,
      personaStage: stage,
      riskPreferenceStatus: investmentContext.riskPreferenceStatus || "needs_probe",
      stageFocus,
      steps,
      questions,
      boundaries: ["不推荐具体产品", "不承诺收益", "不绕过风险测评", "不鼓励借贷投资"]
    }
  };
}

function shouldShowInvestmentCard(query, guidance) {
  const card = guidance.card || {};
  const context = guidance.investmentContext || {};
  if (card.title === "理财学习路径卡") return true;
  if (card.title === "风险偏好探索卡" || card.title === "理财目的识别卡" || card.title === "长期配置思路卡" || card.title === "目标金规划卡") return true;
  if (context.riskFlag) return true;
  if (/对比|区别|计划|路径|步骤|表|卡片|帮我梳理|怎么学|7天|一周/.test(query)) return true;
  if (context.assetType === "A股" || context.assetType === "黄金") return true;
  return false;
}

function shouldShowPersonaHint(query, routeIntent, guidance) {
  if (["goal_setup", "goal_update", "use_demo_persona"].includes(routeIntent)) return true;
  if (!guidance?.investmentContext) return false;
  const context = guidance.investmentContext;
  return (
    context.purpose === "财商培养" ||
    context.purpose === "目标储蓄" ||
    context.purpose === "跟风怕错过" ||
    /只是想|先学习|不急着买|多久不用|亏|焦虑|我会|我能接受|目标是/.test(query)
  );
}

function investmentActionsFor(query, guidance) {
  const assetType = guidance.investmentContext.assetType || "理财资产";
  const title = guidance.card.title;
  const purpose = guidance.investmentContext.purpose;

  if (title === "目标金规划卡" || purpose === "目标储蓄") {
    return [
      { label: "拆成目标金和学习金", query: "帮我把这笔钱拆成目标金和基金学习金两个桶" },
      { label: "检查每月压力", query: "按我的生活费和安全垫，看看每月存这笔目标金压力大不大" }
    ];
  }

  if (title === "理财学习路径卡") {
    return [
      { label: "选学习方向", query: assetType === "基金" ? "我想先学基金定投和指数基金的区别" : "我想先学基金定投和股票市场基础" },
      { label: "安排学习计划", query: "帮我安排一个不涉及购买的7天理财入门学习计划" }
    ];
  }

  if (title === "长期配置思路卡" || purpose === "长期配置" || /配置思路|长期资产配置|持仓结构/.test(query)) {
    return [
      { label: "给我配置原则", query: `基于我现在的情况，给我一套${assetType}长期配置的原则，不要推荐具体产品` },
      { label: "看集中度风险", query: "帮我判断现在持仓会不会太集中，应该怎么看" }
    ];
  }

  if (assetType === "基金") {
    return [
      { label: "长期资产配置", query: "我是为了长期资产配置，不是短期行情" },
      { label: "先校准风险", query: "这笔钱半年以上不用，如果基金短期下跌10%，我会先复盘不急着卖" }
    ];
  }

  if (assetType === "A股") {
    return [
      { label: "先学不买", query: "我只是想先学习A股基础，不急着买入" },
      { label: "识别风险边界", query: "买A股前我应该先确认哪些风险边界" }
    ];
  }

  return [
    { label: "说清楚用途", query: `我主要是为了长期配置来了解${assetType}` },
    { label: "先做模拟学习", query: `我只是想先学习${assetType}，不急着买入` }
  ];
}

export async function runLearningAgent(query, userId = demoUserId, intent = "low_risk_learning", options = {}) {
  const context = getCashflowContext(userId, { intent });
  const sessionMemory = options.sessionMemory || getSessionMemory(userId);
  const knowledge = knowledgeSearch(query, intent);
  const suitability = assessSuitability({ profile: context.profile, budget: context.budget, query });
  const askedRiskLabel = /R1|R2|风险等级/.test(query);
  const restricted = intent === "restricted_recommendation";
  const riskRadar = intent === "risk_radar";
  const peerPressure = intent === "peer_pressure_check";
  const advanced = intent === "advanced_risk_calibration";
  const investmentDecision = intent === "investment_decision_guidance";
  if (riskRadar) {
    return {
      reply:
        "这个信号要先刹住：短期高收益、转账进群、保本高收益或借钱投资，都不适合用来做学生理财决策。先别转账，也别为了收益绕过正规渠道和风险测评。",
      card: {
        type: "risk_radar_card",
        title: "风险雷达卡",
        level: "高风险",
        redFlags: ["短期高收益承诺", "私下转账或进群", "可能绕过正规风险测评"],
        safeActions: ["先不转账", "核实正规渠道", "只做品类学习，不做购买决定"]
      },
      actions: [
        { label: "解释风险等级", query: "R1/R2 这种风险等级是什么意思？" },
        { label: "回到我的画像", query: "看看我的资金分桶适合怎么安排" }
      ],
      snapshot: snapshotFor(userId, { intent }),
      streamMode: "deterministic"
    };
  }
  if (investmentDecision) {
    const guidance = buildInvestmentGuidance({ query, profile: context.profile, sessionMemory });
    const oldInvestmentProfile = context.profile.investmentProfile || {};
    if (guidance.investmentContext.assetType !== "理财资产" || guidance.investmentContext.purpose !== "unknown") {
      updateProfile(userId, {
        investmentProfile: {
          ...oldInvestmentProfile,
          assetInterest: uniqueList([
            ...(oldInvestmentProfile.assetInterest || []),
            guidance.investmentContext.assetType === "理财资产" ? "" : guidance.investmentContext.assetType
          ]),
          purpose: uniqueList([
            ...(oldInvestmentProfile.purpose || []),
            guidance.investmentContext.purpose === "unknown" ? "" : guidance.investmentContext.purpose
          ]),
          riskPreferenceStatus: oldInvestmentProfile.riskPreferenceStatus || "needs_probe",
          lastUpdatedFrom: "conversation"
        }
      });
    }
    return {
      reply: guidance.reply,
      card: guidance.card,
      showCard: shouldShowInvestmentCard(query, guidance),
      personaInsight: shouldShowPersonaHint(query, intent, guidance),
      investmentContext: guidance.investmentContext,
      actions: investmentActionsFor(query, guidance),
      snapshot: snapshotFor(userId, { intent }),
      sessionMemory,
      streamMode: "llm"
    };
  }
  if (peerPressure) {
    return {
      reply:
        "这更像是“怕错过”的压力，不是一个完整的理财理由。我们先不看同学买没买，先看这笔钱是不是闲钱、产品期限和风险等级是否清楚，以及会不会影响你的生活费和安全垫。",
      card: {
        type: "peer_cooling_card",
        title: "跟风降温卡",
        emotion: "怕错过 / 从众压力",
        checks: ["这笔钱未来 30 天是否会用到", "风险等级、期限、费用是否清楚", "是否会影响生活费或安全垫"],
        nextStep: "先把同学行为从决策依据里拿掉，用自己的资金分桶判断。"
      },
      actions: [
        { label: "判断这笔闲钱", query: "帮我判断这 1000 元是不是学习型闲钱" },
        { label: "解释低风险", query: "低风险理财到底低在哪里？" }
      ],
      snapshot: snapshotFor(userId, { intent }),
      streamMode: "deterministic"
    };
  }
  if (advanced) {
    return {
      reply:
        "你已经不是纯入门场景了，重点不该只看“要不要多配”，而是先校准风险：这笔钱多久不用、是否会压缩安全垫、已有配置是否太集中，以及你能不能接受阶段性回撤。",
      card: {
        type: "risk_calibration_card",
        title: "进阶风险校准卡",
        experience: context.profile.riskProfile?.experience || ["已有理财接触"],
        checks: ["流动性：未来 1-3 个月是否会用到", "回撤：短期下跌能否接受", "集中度：是否押在单一品类", "边界：不替代正规投资建议"],
        nextStep: "先补齐期限、用途和已有配置比例，再判断是否继续学习或咨询正规渠道。"
      },
      actions: [
        { label: "修改月收入", query: "修改我的月收入为4000" },
        { label: "识别高收益风险", query: "30 天收益 8% 靠谱吗？" }
      ],
      snapshot: snapshotFor(userId, { intent }),
      streamMode: "deterministic"
    };
  }
  const card = {
    type: intent === "category_compare" ? "category_compare_card" : "low_risk_learning_card",
    title: askedRiskLabel ? "风险等级入门卡" : "低风险适当性卡",
    tags: restricted ? ["不推荐具体产品", "不承诺收益"] : ["先看安全垫", "低风险不等于无风险"],
    items: knowledge.snippets.map((item) => item.content),
    citations: knowledge.snippets.map((item) => ({ title: item.title, source: item.source })),
    categories:
      intent === "category_compare"
        ? [
            { name: "存款", summary: "规则清楚，重点看期限和提前支取。" },
            { name: "货币基金", summary: "流动性较好，但收益会波动。" },
            { name: "现金管理类", summary: "先看风险等级、赎回规则和费用。" }
          ]
        : undefined
  };

  const reply = restricted
    ? "这个我不能直接推荐具体产品，也不能按收益最高排序。更适合先看品类：存款、货币基金、现金管理类，再比较风险等级、期限、流动性和费用。"
    : askedRiskLabel
      ? "R1/R2 是理财产品常见的风险等级标签，通常代表较低风险，但不等于无风险。你可以先把它理解成“波动可能较小，但仍要看期限、费用和赎回规则”。"
      : `${suitability.summary} 重点不是马上买，而是先判断这笔钱是不是学习型闲钱：多久不用、能不能承受波动、会不会影响生活费和安全垫。`;

  return {
    reply,
    card,
    actions: [
      { label: "解释风险等级", query: "R1/R2 这种风险等级是什么意思？" },
      { label: "同学都在买", query: "同学都在买，我不买会不会亏？" }
    ],
    citations: card.citations,
    snapshot: snapshotFor(userId, { intent })
  };
}

export async function runFallbackAgent(query, userId = demoUserId) {
  return {
    reply:
      "这个问题我可以简单陪你想一下，但小招对这一方面没有那么了解。你可以试着问我：怎么建立理财画像、今天消费怎么安排，或者低风险理财入门要先看什么。",
    card: {
      type: "fallback_card",
      title: "小招更擅长这些",
      suggestions: ["建立月生活费和安全垫画像", "根据账单看今日消费空间", "解释低风险理财入门概念"]
    },
    actions: defaultActions,
    snapshot: snapshotFor(userId, { intent: "fallback" })
  };
}

export async function runAgent(query, userId = demoUserId, options = {}) {
  const injectedPreset = normalizePresetId(options.personaPreset || options.presetId || options.preset);
  if (injectedPreset) {
    applyPresetPersona(userId, injectedPreset);
  }
  if (options.persona || options.profile || options.profilePatch) {
    injectPersona(userId, options.persona || options.profile || options.profilePatch);
  }

  const sessionMemory = options.sessionMemory || getSessionMemory(userId);
  const route = await routeIntent(query, { ...options, profile: getUser(userId).profile, sessionMemory });
  let result;

  if (["memory_confirm", "memory_reject", "memory_list"].includes(route.intent)) {
    result = handleMemoryIntent({ userId, query, intent: route.intent });
    result.snapshot = snapshotFor(userId, { intent: route.intent });
    result.streamMode = "deterministic";
  } else if (capabilityFor(route.intent) === "capability_1") {
    const routedQuery = route.presetId ? `${query} ${route.presetId}` : query;
    result = await runGoalAgent(routedQuery, userId, route.intent);
    result.personaInsight = ["use_demo_persona", "goal_setup", "goal_update"].includes(route.intent);
  } else if (capabilityFor(route.intent) === "capability_2") {
    result = await runCashflowAgent(query, userId, route.intent);
  } else if (capabilityFor(route.intent) === "capability_3") {
    result = await runLearningAgent(query, userId, route.intent, { sessionMemory });
  } else {
    result = await runFallbackAgent(query, userId);
  }

  return {
    intent: route.intent,
    capability: capabilityFor(route.intent),
    legacyCapability: null,
    capabilityName: capabilityNameFor(route.intent),
    route,
    ...result,
    sessionMemory,
    actions: (result.actions || defaultActions).slice(0, 2),
    snapshot: result.snapshot || snapshotFor(userId, { intent: route.intent })
  };
}
