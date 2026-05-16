"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitCompare,
  HeartHandshake,
  Menu,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
  X
} from "lucide-react";

const PROFILE_TEMPLATE =
  "我是小李，我每个月生活费2500元。我兼职每个月能赚大概800元，我想攒点钱，了解一些理财产品，争取半年后换个手机。";

const SESSION_STORAGE_KEY = "xiaozhao-demo-session-memory";

const judgePersonas = [
  {
    id: "chen",
    name: "小陈",
    tag: "基础资金安排",
    summary: "2500 元生活费，先留 300 元安全垫，关注餐饮、饮品和周五社交。",
    details: {
      funds: "月生活费 2500 元，安全垫 300 元，偶尔有兼职或奖学金。",
      experience: "还没有资金分层意识，适合从生活费、目标金和安全垫开始。",
      pain: "生活费、额外收入和想攒的钱容易混在一起。",
      capability: "能力 1：资金分桶与理财画像；能力 2：配置守望。"
    },
    query:
      "用小陈示例身份开始。评委画像注入：我叫小陈，每个月生活费2500元，安全垫300元，重点关注餐饮、饮品和周五社交支出，提醒风格温和一点。"
  },
  {
    id: "zhou",
    name: "小周",
    tag: "闲钱试水",
    summary: "3300 元生活费，有 1000 元学习型闲钱，想了解低风险，也怕错过同学都在投的机会。",
    details: {
      funds: "月生活费 3300 元，有 1000-3000 元实习补贴或奖学金结余。",
      experience: "对余额宝、货币基金、定投等词感兴趣，但风险理解还模糊。",
      pain: "不知道闲钱是不是真的闲，也容易被同学和社媒影响。",
      capability: "能力 3：理财决策陪伴、低风险适当性判断和跟风降温。"
    },
    query:
      "请切换到小周评委画像：我叫小周，每个月生活费3300元，安全垫1000元，关注学习资料、咖啡、朋友聚餐和网购消费，提醒风格温和一点，目标是先把生活费节奏稳住。"
  },
  {
    id: "lin",
    name: "小林",
    tag: "风险校准",
    summary: "5200 元可支配资金，买过货币基金和基金定投，需要关注回撤、流动性和集中度。",
    details: {
      funds: "月可支配资金 4500-6000 元，可能包含生活费、实习补贴或家庭支持。",
      experience: "买过货币基金、定期或基金定投，能理解基础品类。",
      pain: "容易看历史收益，忽略回撤、期限错配、流动性和集中度。",
      capability: "能力 3：进阶风险校准、高波动资产适当性和风险偏好三问一测。"
    },
    query:
      "请切换到小林评委画像：我叫小林，每个月生活费5200元，安全垫1800元，关注学习、网购和社交消费，也希望后续回答帮我校准回撤、流动性和集中度，提醒风格严格一点。"
  }
];

function statusText(status) {
  return { relaxed: "宽松", normal: "正常", tight: "偏紧", alert: "预警" }[status] || "正常";
}

function yuan(value) {
  return `${Math.round(Number(value || 0))} 元`;
}

function getList(card) {
  return card.items || card.points || card.suggestions || card.highlights || [];
}

function Card({ card }) {
  if (!card) return null;

  if (card.type === "goal_setup_card") {
    return (
      <section className="xcard">
        <div className="cardTitle">
          <Target size={18} />
          <span>{card.title || "我的理财小目标"}</span>
        </div>
        <div className="goalMain">{card.primaryGoal || "先建立清晰画像"}</div>
        <div className="metricGrid">
          <div>
            <span>月生活费</span>
            <b>{yuan(card.monthlyIncome)}</b>
          </div>
          <div>
            <span>安全垫</span>
            <b>{yuan(card.safetyBuffer)}</b>
          </div>
          {card.idleMoney > 0 && (
            <div>
              <span>学习型闲钱</span>
              <b>{yuan(card.idleMoney)}</b>
            </div>
          )}
        </div>
        <div className="tags">
          {(card.focusCategories || []).map((tag) => (
            <i key={tag}>{tag}</i>
          ))}
        </div>
      </section>
    );
  }

  if (card.type === "today_budget_card") {
    return (
      <section className="xcard budgetCard">
        <div className="cardTitle">
          <WalletCards size={18} />
          <span>{card.title || "今日消费空间"}</span>
          <em>{statusText(card.status)}</em>
        </div>
        <div className="budgetNo">
          <span>建议可安排</span>
          <b>{card.spendableAmount ?? 0}</b>
          <span>元</span>
        </div>
        <p className="muted">今日已确认支出：{yuan(card.todaySpent)}</p>
        <div className="why">
          {(card.why || []).slice(0, 3).map((item) => (
            <p key={item}>
              <ShieldCheck size={14} />
              {item}
            </p>
          ))}
        </div>
        {card.missingDataHint && <div className="hint">{card.missingDataHint}</div>}
        <div className="suggestions">
          {(card.suggestions || []).map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    );
  }

  if (card.type === "low_risk_learning_card") {
    return (
      <section className="xcard learningCard">
        <div className="cardTitle">
          <BookOpen size={18} />
          <span>{card.title || "理财认知卡"}</span>
        </div>
        <div className="pillRow">
          {(card.tags || ["低风险不等于无风险"]).map((tag) => (
            <i key={tag}>{tag}</i>
          ))}
        </div>
        <div className="suggestions">
          {getList(card).slice(0, 4).map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    );
  }

  if (card.type === "category_compare_card") {
    const rows = card.categories || card.options || card.rows || [];
    return (
      <section className="xcard compareCard">
        <div className="cardTitle">
          <GitCompare size={18} />
          <span>{card.title || "品类对比"}</span>
        </div>
        <div className="compareRows">
          {rows.map((row) => (
            <div className="compareRow" key={row.name || row.category || row.title}>
              <b>{row.name || row.category || row.title}</b>
              <span>{row.summary || row.desc}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (card.type === "memory_confirm_card") {
    return (
      <section className="xcard memoryCard">
        <div className="cardTitle">
          <CheckCircle2 size={18} />
          <span>{card.title || "记忆确认"}</span>
        </div>
        <p className="memoryText">{card.memory || card.content || "我会先征得你同意，再把这个习惯用于预算预留。"}</p>
        <div className="pillRow">
          {(card.relatedCategories || ["预算习惯"]).map((tag) => (
            <i key={tag}>{tag}</i>
          ))}
        </div>
      </section>
    );
  }

  if (card.type === "companion_nudge_card") {
    return (
      <section className="xcard nudgeCard">
        <div className="cardTitle">
          <HeartHandshake size={18} />
          <span>{card.title || "搭子轻提醒"}</span>
        </div>
        <p className="memoryText">{card.message || card.nudge}</p>
        <div className="suggestions">
          {getList(card).slice(0, 3).map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    );
  }

  if (card.type === "investment_guidance_card") {
    const meta = [
      card.assetType && `资产：${card.assetType}`,
      card.purpose && card.purpose !== "unknown" ? `目的：${card.purpose}` : "目的待确认",
      card.riskPreferenceStatus === "known" ? "风险偏好已记录" : "需要做三问一测"
    ].filter(Boolean);

    return (
      <section className="xcard investmentCard">
        <div className="cardTitle">
          <BookOpen size={18} />
          <span>{card.title || "理财决策引导卡"}</span>
        </div>
        <div className="investmentMeta">
          {meta.map((item) => (
            <i key={item}>{item}</i>
          ))}
        </div>
        {card.stageFocus && <div className="decisionFocus">{card.stageFocus}</div>}
        <div className="decisionGrid">
          <div>
            <b>决策路径</b>
            {(card.steps || []).slice(0, 4).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          <div>
            <b>三问一测</b>
            {(card.questions || []).slice(0, 3).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
        <div className="boundaryRow">
          {(card.boundaries || []).slice(0, 4).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    );
  }

  if (["risk_radar_card", "peer_cooling_card", "risk_calibration_card"].includes(card.type)) {
    const rows = card.redFlags || card.checks || [];
    return (
      <section className="xcard learningCard">
        <div className="cardTitle">
          <ShieldCheck size={18} />
          <span>{card.title || "风险提示卡"}</span>
          {card.level && <em>{card.level}</em>}
        </div>
        <div className="suggestions">
          {rows.slice(0, 4).map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        {(card.safeActions || card.nextStep) && (
          <div className="hint">
            {Array.isArray(card.safeActions) ? card.safeActions.join(" / ") : card.nextStep}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="xcard">
      <div className="cardTitle">
        <Sparkles size={18} />
        <span>{card.title || "小招提示"}</span>
      </div>
      {getList(card).map((item) => (
        <p className="suggestion" key={item}>
          {item}
        </p>
      ))}
    </section>
  );
}

function Message({ msg, onPrefill }) {
  const user = msg.role === "user";
  return (
    <div className={`msgRow ${user ? "user" : ""}`}>
      {!user && (
        <div className="avatar">
          <Bot size={18} />
        </div>
      )}
      <div className="msgStack">
        <div className={`bubble ${user ? "userBubble" : ""} ${msg.streaming ? "streamingBubble" : ""}`}>
          {msg.content}
        </div>
        <Card card={msg.card} />
        {msg.actions?.length > 0 && (
          <div className="followups">
            {msg.actions.slice(0, 2).map((item) => (
              <button
                key={item.query || item.label}
                onClick={() => onPrefill(item.prefill || item.query || item.label)}
              >
                {item.label || item.query}
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        )}
        {msg.personaInsight && !user && <p className="personaHint">小招现在更了解你一些了</p>}
      </div>
    </div>
  );
}

function PersonaDock({ activePersona, collapsed, onCollapseDock, onExpandDock, onSelect, onPrefill }) {
  const active = judgePersonas.find((persona) => persona.id === activePersona);

  if (collapsed) {
    return (
      <section className="personaDock compact" aria-label="预设画像入口">
        <button className="personaDockEntry" type="button" onClick={onExpandDock}>
          <UserRound size={15} />
          <span>{active ? `当前预设画像：${active.name}` : "预设画像"}</span>
          <ChevronDown size={15} />
        </button>
      </section>
    );
  }

  return (
    <section className="personaDock" aria-label="评委画像选择">
      <div className="personaIntro">
        <div>
          <span>快速上手</span>
          <b>快速上手：可以选择预设的同学画像，也可以通过对话让小招认识你~</b>
          <p>预设画像用于 Demo 快速初始化；后续对话更新的是当前 Persona DB。</p>
        </div>
        <button className="personaCollapseBtn" type="button" onClick={onCollapseDock}>
          收起
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="personaCards">
        {judgePersonas.map((persona) => {
          return (
            <article className={activePersona === persona.id ? "personaCard active" : "personaCard"} key={persona.id}>
              <i>
                <UserRound size={16} />
              </i>
              <span>{persona.name}</span>
              <em>{persona.tag}</em>
              <p>{persona.summary}</p>
              <div className="personaActions">
                <button type="button" className="solidBtn" onClick={() => onSelect(persona)}>
                  选择画像
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <button className="profileTemplateBtn" type="button" onClick={() => onPrefill(PROFILE_TEMPLATE)}>
        对话补充画像
      </button>
    </section>
  );
}

function ProfileSheet({ snapshot, onClose }) {
  const profile = snapshot?.profile || {};
  const memories = snapshot?.personaMemories || [];
  const top = snapshot?.stats?.week?.topCategories?.slice(0, 3) || [];
  return (
    <div className="sheetMask">
      <aside className="profileSheet">
        <div className="sheetHead">
          <div>
            <span>我的画像</span>
            <b>{profile.name || "同学"}</b>
          </div>
          <button onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="sideLine">
          <span>月生活费</span>
          <b>{profile.monthlyIncome ? yuan(profile.monthlyIncome) : "待补充"}</b>
        </div>
        <div className="sideLine">
          <span>安全垫</span>
          <b>{profile.safetyBuffer !== null && profile.safetyBuffer !== undefined ? yuan(profile.safetyBuffer) : "待补充"}</b>
        </div>
        <div className="sideLine">
          <span>提醒风格</span>
          <b>{profile.coachStyle === "strict" ? "严格一点" : "温和一点"}</b>
        </div>
        <h3>关注品类</h3>
        <div className="memoryList">
          {(profile.categoryLimits || []).map((item) => (
            <span key={item.category}>{item.category}</span>
          ))}
          {(profile.categoryLimits || []).length === 0 && <span>待补充</span>}
        </div>
        <h3>小招记住的习惯</h3>
        <div className="memoryList">
          {memories.slice(0, 3).map((item) => (
            <span key={item.label || item.memoryId}>{item.label || item.content}</span>
          ))}
          {memories.length === 0 && <span>暂无</span>}
        </div>
        <h3>本周类别</h3>
        {top.map((item) => (
          <div className="bar" key={item.category}>
            <span>{item.category}</span>
            <i>
              <em style={{ width: `${Math.min(100, item.amount)}%` }} />
            </i>
            <b>{Math.round(item.amount)}</b>
          </div>
        ))}
        {top.length === 0 && <p className="muted">还没有账单统计。用小陈示例或补记一笔后就能看到。</p>}
      </aside>
    </div>
  );
}

function normalizeStreamEvent(payload) {
  if (!payload) return {};
  try {
    const data = JSON.parse(payload);
    return {
      delta: data.text || data.delta || data.replyDelta || data.content || "",
      final: data.done || data.final ? data : null,
      snapshot: data.snapshot,
      card: data.card,
      cards: data.cards,
      actions: data.actions,
      personaInsight: data.personaInsight,
      route: data.route,
      reply: data.reply
    };
  } catch {
    return { delta: payload };
  }
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "嗨，我是小招同学。可以先点一个同学画像快速体验，也可以直接告诉我每月生活费、安全垫和最想关注的消费。",
      actions: [
        { label: "对话补充画像", prefill: PROFILE_TEMPLATE },
        { label: "先看今天预算", query: "帮我看看今天的消费空间" }
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [clientSessionMemory, setClientSessionMemory] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [activePersona, setActivePersona] = useState(null);
  const [personaCollapsed, setPersonaCollapsed] = useState(false);
  const endRef = useRef(null);
  const activeRequestRef = useRef(null);
  const activeAssistantRef = useRef(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    try {
      const savedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) setClientSessionMemory(JSON.parse(savedSession));
    } catch {}

    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => {
        const user = data.store?.users?.["demo-student"];
        const personaMemories = data.store?.personaMemories || [];
        if (user?.profile) {
          setSnapshot({ profile: { ...user.profile, name: user.name }, personaMemories });
        }
      })
      .catch(() => {});
  }, []);

  function rememberSession(sessionMemory) {
    if (!sessionMemory) return;
    setClientSessionMemory(sessionMemory);
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionMemory));
    } catch {}
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function updateAssistant(id, patch) {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)));
  }

  async function askStream(clean, assistantId, signal, sessionMemory) {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: clean, sessionMemory }),
      signal
    });
    if (!res.ok || !res.body) throw new Error("stream unavailable");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let content = "";
    let lineBuffer = "";
    let finalData = {};

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() || "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("event:")) continue;
        if (!line.startsWith("data:")) continue;
        const event = normalizeStreamEvent(line.slice(5).trim());
        if (event.delta) {
          content += event.delta;
          updateAssistant(assistantId, { content });
        }
        finalData = { ...finalData, ...event.final, ...event };
      }
    }

    const reply = finalData.reply || content;
    if (finalData.snapshot) setSnapshot(finalData.snapshot);
    rememberSession(finalData.sessionMemory);
    updateAssistant(assistantId, {
      content: reply,
      card: finalData.card,
      actions: finalData.actions,
      personaInsight: finalData.personaInsight,
      route: finalData.route,
      streaming: false
    });
  }

  async function askFallback(clean, assistantId, signal, sessionMemory) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: clean, sessionMemory }),
      signal
    });
    const data = await res.json();
    setSnapshot(data.snapshot);
    rememberSession(data.sessionMemory);
    updateAssistant(assistantId, {
      content: data.reply,
      card: data.card,
      actions: data.actions,
      personaInsight: data.personaInsight,
      route: data.route,
      streaming: false
    });
  }

  async function ask(query, options = {}) {
    const clean = query.trim();
    if (!clean) return;
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      const previousAssistantId = activeAssistantRef.current;
      if (previousAssistantId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== previousAssistantId));
      }
    }

    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;
    const controller = new AbortController();
    activeRequestRef.current = controller;

    const assistantId = `assistant-${Date.now()}`;
    activeAssistantRef.current = assistantId;
    const shownContent = options.displayContent || clean;
    const sessionForRequest = options.resetSession ? null : clientSessionMemory;
    setInput("");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: shownContent },
      { id: assistantId, role: "assistant", content: "", streaming: true }
    ]);

    try {
      await askStream(clean, assistantId, controller.signal, sessionForRequest);
    } catch (error) {
      if (error?.name === "AbortError") return;
      try {
        await askFallback(clean, assistantId, controller.signal, sessionForRequest);
      } catch (fallbackError) {
        if (fallbackError?.name === "AbortError") return;
        updateAssistant(assistantId, {
          content: "刚才连接有点不稳。你可以再试一次，或者先让我帮你建立画像。",
          streaming: false,
          actions: [
            { label: "对话补充画像", prefill: PROFILE_TEMPLATE },
            { label: "用小陈示例", query: judgePersonas[0].query }
          ]
        });
      }
    } finally {
      if (requestSeqRef.current === requestId) {
        setLoading(false);
        activeRequestRef.current = null;
        activeAssistantRef.current = null;
      }
    }
  }

  function selectPersona(persona) {
    setActivePersona(persona.id);
    setPersonaCollapsed(true);
    setClientSessionMemory(null);
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    ask(persona.query, { displayContent: `用${persona.name}画像体验`, resetSession: true });
  }

  function prefillProfileTemplate(text) {
    setInput(text);
    setTimeout(() => {
      document.querySelector(".composer input")?.focus();
    }, 0);
  }

  async function resetDemo() {
    setClientSessionMemory(null);
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true })
    });
    window.location.reload();
  }

  return (
    <main className="appShell single">
      <section className="phone">
        <header className="topbar">
          <div className="brand">
            <div className="logo">招</div>
            <div>
              <h1>小招同学</h1>
              <p>非营销型理财陪伴搭子</p>
            </div>
          </div>
          <div className="topBtns">
            <button title="预设画像" onClick={() => setPersonaCollapsed((prev) => !prev)}>
              <UserRound size={18} />
            </button>
            <button title="重置 Demo" onClick={resetDemo}>
              <RotateCcw size={18} />
            </button>
            <button title="我的画像" onClick={() => setShowProfile(true)}>
              <Menu size={18} />
            </button>
          </div>
        </header>

        <PersonaDock
          activePersona={activePersona}
          collapsed={personaCollapsed}
          onCollapseDock={() => setPersonaCollapsed(true)}
          onExpandDock={() => setPersonaCollapsed(false)}
          onSelect={selectPersona}
          onPrefill={prefillProfileTemplate}
        />

        <div className="chat">
          {messages.map((msg, index) => (
            <Message key={msg.id || `${msg.role}-${index}`} msg={msg} onPrefill={prefillProfileTemplate} />
          ))}
          <div ref={endRef} />
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="和小招聊聊" />
          <button disabled={!input.trim()} type="submit">
            <Send size={18} />
          </button>
        </form>

        {showProfile && <ProfileSheet snapshot={snapshot} onClose={() => setShowProfile(false)} />}
      </section>
    </main>
  );
}
