# 小招同学 Demo

这是“小招同学”金融陪伴 demo 的前端/agent 验收工作区。当前测试重点是 agent 能力契约，而不是 UI 像素级回归。

## 本地运行

```bash
npm install
npm run dev -- -p 3001
```

访问：

[http://localhost:3001](http://localhost:3001)

环境变量见 `.env.example`。本地 `.env.local` 可配置：

- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL=https://api.minimaxi.com/v1`
- `MINIMAX_MODEL=MiniMax-M2.7-highspeed`

## Demo 架构

```text
React 对话首页
  ↓
/api/chat
  ↓
Intent Router
  ↓
能力1目标画像 / 能力2现金流守望 / 能力3低风险认知 / Fallback Agent
  ↓
Mock 账单、目标画像、预算算法、日周月统计、账单修正保存、persona memory
```

核心能力：

- 能力1：目标设定与理财画像，生成目标设定卡、预算边界和用户财务画像。
- 能力2：今日现金流陪伴与搭子守望，读取账单、计算今日可花额度、支持补记/修正，并基于已确认记忆做轻提醒。
- 能力3：入门理财认知与低风险适配，解释 R1/R2、存款、货币基金、现金管理等基础概念，并拒绝具体产品推荐。
- 兜底 Agent：回答非核心问题，并引导回能力1/2/3。

兼容旧命名：

- 旧 `capability_0` 可视为能力1。
- 旧 `capability_1` 可视为能力2。
- 新能力3建议返回 `ability_3`、`capability_3`、`low_risk_learning` 或 `suitability_check`。

## 扫码体验部署

推荐部署到 Vercel：

1. 将 `xiaozhao-demo` 作为项目根目录推送到 GitHub。
2. 在 Vercel 新建项目，Root Directory 选择 `xiaozhao-demo`。
3. 配置环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`。
4. 部署后获得公网 URL。
5. 用任意二维码生成器把公网 URL 转成二维码，放入 PPT 或视频演示。

## 测试命令

默认运行内置 mock，不依赖真实长耗时 LLM：

```bash
npm run test:agent
```

当前自动化覆盖 12 个核心验收场景：

- 意图识别
- 能力1：目标设定与理财画像
- 能力2：今日现金流陪伴
- 兜底 agent
- 推荐问题
- 用户修改账单保存
- 日/周/月统计
- 能力3：R1/R2 认知解释
- 能力3：1000元闲钱低风险适配
- 能力3：具体产品推荐拒答
- persona memory/搭子守望
- `/api/chat/stream` 流式冒烟

如果主 agent 已提供 HTTP 接口，可改为测试真实服务：

```bash
$env:XIAOZHAO_AGENT_URL="http://localhost:3001/api/chat"
npm run test:agent
```

如果流式接口已提供，可同时测试 `/api/chat/stream`：

```bash
$env:XIAOZHAO_AGENT_URL="http://localhost:3001/api/chat"
$env:XIAOZHAO_STREAM_URL="http://localhost:3001/api/chat/stream"
npm run test:agent
```

脚本会向接口发送：

```json
{
  "query": "用户输入",
  "message": "用户输入",
  "userId": "qa-student-001",
  "sessionId": "qa-acceptance-session",
  "context": {
    "today": "2026-05-15",
    "profile": {},
    "bills": []
  }
}
```

建议 JSON 接口响应至少包含：

- `intent`：识别出的意图，如 `goal_setup`、`today_budget`、`low_risk_learning`、`restricted_recommendation`、`fallback`
- `capability`：路由能力，如 `ability_1`、`ability_2`、`ability_3`
- `reply`：给用户的自然语言回复
- `recommendedQuestions`：推荐追问数组，本 demo 每次返回 2 个
- `state.goal` 或 `state.profile`：目标设定与画像结果
- `stats.day/week/month`：日、周、月统计结果
- `state.profile.personaMemories`：已确认保存的预算相关记忆

流式接口建议：

- 路径：`POST /api/chat/stream`
- 请求体同 `/api/chat`
- 返回非空文本流或 SSE
- 首屏冒烟可以只验证 HTTP 2xx、非空内容和语义相关性

## 验收文档

手工验收清单见 [tests/ACCEPTANCE.md](tests/ACCEPTANCE.md)。
