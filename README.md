# WorkLog

WorkLog 是一个本地优先的个人记录与报告生成 PWA。它把每日碎片沉淀成项目进展和周期报告，适合个人工作复盘、学习成长、生活记录和阶段性目标管理。

当前版本默认数据保存在浏览器本地；登录后可使用 Cloudflare Pages Functions + D1 做云端同步。

在线体验：[https://worklog-5gb.pages.dev](https://worklog-5gb.pages.dev)

## 功能

- 日历记录：默认显示一周，下拉展开整月，右下角快速新增记录。
- 本周复盘：日历页展示本周记录、项目和风险概览，并可一键生成周报。
- AI 点评：支持今日、本周、项目和报告点评，检查推进质量、风险闭环、缺失证据和职业素材潜力。
- 首次引导：新用户选择记录场景后，直接进入第一条记录输入。
- 记录搜索：支持按日期、项目、类型、原文和整理后内容搜索。
- 常用项目：从历史记录自动提取常用项目，新增记录时一键选择。
- 项目驾驶舱：自动聚合每个项目的记录、完成事项、待跟进、风险和关联目标；支持搜索、按状态筛选、重命名和归档。
- 结构化输入：支持 `work`、`todo`、`risk`、`note`、`life` 五类记录。
- AI 润色：提供 DeepSeek、OpenAI、OpenRouter、硅基流动、Ollama 和自定义服务商预设。
- 模型连接测试：填入服务商、模型名和 API Key 后可直接验证 AI 配置是否可用；接口地址收进高级设置。
- 报告生成：支持周报、项目复盘、阶段总结、今日总结，并支持本周、上周、近 7 天、本月、全部记录和自定义起止日期。
- 项目报告：从记录中自动提取项目，可按项目筛选生成报告。
- 材料选择：生成报告时可选择是否纳入风险、生活、目标、灵感清单。
- 模板自定义：报告结果优先展示，模板放在高级设置中按需编辑。
- 报告材料：目标、灵感和清单可以转成日历记录，也能作为报告材料一键进入阶段总结。
- 心愿管理：年度目标、阶段性目标、灵感池、想做清单。
- 云同步：邮箱注册/登录后同步记录、目标、灵感和清单到 Cloudflare D1。
- 数据迁移：支持导入/导出 JSON 备份。
- PWA 安装：部署后可在手机浏览器添加到主屏幕。

## 隐私与安全边界

- 模型 API Key 只保存在当前设备本地，不上传到云端，也不会出现在导出的 JSON 备份里。
- 云端只保存记录、目标、灵感、清单、报告模板、AI 点评结果和模型服务商/地址/模型名配置。
- 用户密码在后端使用 PBKDF2 + salt 哈希后存储。
- 当前不支持忘记密码找回。这个选择是为了避免在没有邮件服务、域名和风控能力时做出不可靠的找回流程。
- 这个项目更适合作为个人工具或开源作品集模板；如果要面向大量真实用户，需要补充更完整的安全审计、监控、风控和数据合规方案。

## 开源与线上数据分离

GitHub 仓库只应该包含源码、文档、数据库 schema 和示例配置。线上网站使用的 Cloudflare Pages 设置、D1 绑定、生产数据库和用户数据保留在 Cloudflare，不进入 GitHub。

更详细的边界说明见 [Deployment separation](./docs/DEPLOYMENT_SEPARATION.md)。

## 本地运行

```bash
npm install
npm run web
```

默认会启动 Expo Web 开发服务。你也可以构建静态产物：

```bash
npm run build
```

构建结果会输出到 `dist/`。

提交前可以跑：

```bash
npm run check
```

开源上传前可以单独跑隐私边界检查：

```bash
npm run check:open-source
```

## Cloudflare 部署

部署前复制示例配置：

```bash
cp wrangler.example.toml wrangler.toml
```

创建 D1 数据库后，把 `wrangler.toml` 里的 `database_id` 改成你自己的值：

```bash
npx wrangler d1 create worklog-db
npx wrangler d1 execute worklog-db --remote --file migrations/schema.sql
```

然后在 Cloudflare Pages 中使用：

- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: `functions`
- D1 binding: `DB`

也可以用 Wrangler 部署：

```bash
npm run build
npx wrangler pages deploy dist --project-name worklog
```

部署后可以检查：

```bash
curl https://your-domain.example/api/health
```

更完整的部署说明见 [DEPLOY.md](./DEPLOY.md)。

## 数据备份

在设置页可以导出 JSON 备份。备份包含：

- 记录
- 项目归档状态
- 年度目标和阶段性目标
- 灵感
- 想做清单
- 报告类型和材料选择
- 报告模板
- AI 点评结果
- 模型服务商、接口地址和模型名

备份不包含 API Key。

## Project Docs

- [Product notes](./docs/PRODUCT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Deployment separation](./docs/DEPLOYMENT_SEPARATION.md)
- [Examples](./docs/EXAMPLES.md)
- [Open source guide](./docs/OPEN_SOURCE.md)
- [Roadmap](./ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [Changelog](./CHANGELOG.md)

## License

[MIT](./LICENSE)
