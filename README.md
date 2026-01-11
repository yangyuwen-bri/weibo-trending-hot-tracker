# Weibo Trending Hot Tracker (微博热搜追踪器)

A Next.js application designed to **track, archive, and analyze** Weibo Trending Topics (Hot Search).

## ✨ 架构特性 (Architecture)

本项目采用 **"双引擎" (Dual-Engine)** 架构，完美绕过 Serverless 环境对浏览器的限制：

1.  **后台采集 (Backend Scraper)**:
    *   托管于 **GitHub Actions**。
    *   使用完整版 Playwright 浏览器，模拟真实用户每15分钟抓取微博热搜榜。
    *   数据直接写入云端 Postgres 数据库。
2.  **前台分析 (Frontend Analysis)**:
    *   托管于 **Vercel**。
    *   提供实时搜索功能（查询数据库历史）。
    *   提供热搜详情分析（使用轻量级 `fetch` + `cheerio` 抓取实时数据，无需浏览器）。

## ✨ 功能 (Features)

- **历史回溯**: 数据库自动记录热搜历史，支持长周期数据回溯。
- **实时详情**: 点击热搜词，即时抓取阅读量、讨论量、主持人等信息。
- **每日日报**: 支持订阅关键词，每日定时发送邮件日报 (Email Digest)。
- **可视化图表**: 使用 Recharts 绘制精美的交互式趋势图。

## 🛠 技术栈 (Tech Stack)

- **Frontend**: Next.js 15, Tailwind CSS, Recharts
- **Backend Script**: TypeScript, Playwright (Running on GitHub Actions)
- **Database**: Vercel Postgres (Neon)
- **Deployment**: Vercel + GitHub Actions

## 🚀 快速开始 (Getting Started)

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填入数据库连接：
```env
POSTGRES_URL="postgres://..."
```

### 3. 本地开发

启动网页端：
```bash
npm run dev
```

手动运行采集脚本：
```bash
npm run collect
```

## 📦 部署配置 (Deployment Configuration)

### GitHub Actions (采集器)
无需服务器，采集脚本自动运行在 GitHub 上。你需要配置 Secrets：
1.  进入 GitHub Repo -> Settings -> Secrets -> Actions。
2.  添加 `POSTGRES_URL` (与 Vercel 数据库连接字符串一致)。
3.  脚本将每 15 分钟自动运行一次。

### Vercel (网页端)
直接导入本仓库即可。Vercel 会自动识别 Next.js 项目并部署。

## 🙏 致谢 (Acknowledgments)

本项目灵感来源于 [weibo-trending-hot-history](https://github.com/lxw15337674/weibo-trending-hot-history)，在此基础上增加了**实时分析**与**可视化交互**能力。

## 📄 License

MIT
