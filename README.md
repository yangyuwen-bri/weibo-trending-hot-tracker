# Weibo Trending Hot Tracker (微博热搜追踪器)

A Next.js application designed to **track, archive, and analyze** Weibo Trending Topics (Hot Search).
It automatically captures real-time data, builds a historical database, and offers **Daily Email Digests** for keyword monitoring.

## ✨ 特性 (Features)

- **实时分析**: 输入关键词/链接，实时抓取阅读量、讨论量趋势（24小时）。
- **历史回溯**: 内置 Vercel Postgres 数据库，通过 Cron Job 每10分钟自动记录热搜历史。
- **智能搜索**: 优先搜索本地数据库历史，未命中则实时抓取。
- **可视化图表**: 使用 Recharts 绘制精美的交互式趋势图。
- **Serverless 爬虫**: 基于 `@sparticuz/chromium`，完美适配 Vercel Serverless 环境。

## 🛠 技术栈 (Tech Stack)

- **Frontend**: Next.js 14, Tailwind CSS, Recharts, Lucide Icons
- **Backend API**: Next.js API Routes (Serverless)
- **Database**: Vercel Postgres
- **Scraper**: Playwright Core + Cheerio

## 🚀 快速开始 (Getting Started)

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可使用。

*注意：本地开发环境下，API 会自动调用本地的 Chrome 浏览器进行抓取。*

## 📦 部署 (Deployment)

推荐使用 [Vercel](https://vercel.com) 进行一键部署。

1. **Push 代码**: 将本项目提交到 GitHub。
2. **导入项目**: 在 Vercel 后台导入该 Git 仓库。
3. **配置数据库**: 
   - 在 Vercel 项目控制台，点击 "Storage" -> "Create Database" -> "Postgres".
   - 创建后，点击 "Connect Project"，Vercel 会自动注入 `POSTGRES_URL` 等环境变量。
4. **重新部署**: 数据库连接后，重新 Deploy 一次以应用环境变量。

### 定时任务 (Cron Job)

项目包含 `vercel.json` 配置（需手动添加），用于每10分钟触发 `/api/cron/collect`。

在根目录创建 `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/collect",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

## 🙏 致谢 (Acknowledgments)

本项目的核心数据采集逻辑参考了开源项目 [weibo-trending-hot-history](https://github.com/lxw15337674/weibo-trending-hot-history)。

- **核心区别**: 原项目主要专注于历史数据的归档（按小时/天），本项目在此基础上增加了 **关键词模糊搜索** 能力。通过构建本地数据库，支持用户输入任意关键词查询历史热搜记录，而不仅仅是查看榜单快照。
- 感谢原作者提供的 API 接口思路（trend/hottrend）。
- 本项目进一步适配了 Next.js Serverless 环境并提供了可视化交互。

## 📄 License

MIT
