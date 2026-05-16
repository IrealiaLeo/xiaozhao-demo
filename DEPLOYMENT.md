# 小招同学扫码体验部署清单

## 推荐路径

使用 GitHub 私有仓库 + Vercel 部署。部署完成后，将 Vercel 公网 URL 生成二维码，放入 PPT 或提交附件中。

## 上传到 GitHub 的文件

需要上传：

- `src/`
- `scripts/`
- `tests/`
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `jsconfig.json`
- `.gitignore`
- `.vercelignore`
- `.env.example`
- `README.md`
- `DEPLOYMENT.md`

不要上传：

- `.env.local`
- `.next/`
- `node_modules/`
- `.vercel/`
- `*.log`

当前 `.gitignore` 和 `.vercelignore` 已覆盖这些文件。

## Vercel 环境变量

在 Vercel Project Settings -> Environment Variables 中配置：

```text
MINIMAX_API_KEY=你的 MiniMax key
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M2.7-highspeed
MINIMAX_TIMEOUT_MS=45000
```

不要把真实 key 写进仓库。

## Vercel 构建配置

如果仓库根目录就是 `xiaozhao-demo`：

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: 留空

如果仓库根目录是上一级文件夹，需要把 Root Directory 设为：

```text
xiaozhao-demo
```

## 扫码体验

部署成功后，Vercel 会生成类似下面的公网地址：

```text
https://xiaozhao-demo.vercel.app
```

把这个 URL 转成二维码即可。二维码指向首页，不要指向 `/api/chat`。

## Demo 记忆策略

本项目同时使用两层记忆：

- 服务端内存：适合本地 demo，服务重启后清空。
- 浏览器 `localStorage`：适合 Vercel serverless 场景，评委同一台手机连续体验时，会把压缩后的 session memory 随请求带给后端。

这不是正式生产级存储。正式产品可升级为 Redis / Vercel KV / 数据库，将 persona、session memory、账单修正和用户授权记录拆分保存。

## 上线前检查

```bash
npm install
npm run build
npm run test:agent
```

通过后再部署。
