# 部署说明

WorkLog 推荐部署为 Cloudflare Pages PWA，后端使用 Pages Functions，数据库使用 Cloudflare D1。这个方案成本低，适合个人项目、作品集和早期试用。

如果项目同时开源，GitHub 仓库只放源码和示例配置；生产 D1 绑定、真实 `wrangler.toml`、用户数据和 Cloudflare 凭据保留在 Cloudflare 或本机。详细说明见 [docs/DEPLOYMENT_SEPARATION.md](./docs/DEPLOYMENT_SEPARATION.md)。

## 1. 准备项目

```bash
npm install
npm run build
```

构建产物位于 `dist/`。`scripts/prepare-pwa.js` 会自动生成 PWA manifest、service worker、图标和 Cloudflare headers。

提交或部署前也可以使用：

```bash
npm run check
```

## 2. 创建 D1 数据库

```bash
npx wrangler login
npx wrangler d1 create worklog-db
```

复制返回的 `database_id`，然后创建本地 `wrangler.toml`：

```bash
cp wrangler.example.toml wrangler.toml
```

把 `database_id = "YOUR_D1_DATABASE_ID"` 改成自己的数据库 id。

初始化表结构：

```bash
npx wrangler d1 execute worklog-db --remote --file migrations/schema.sql
```

当前 schema 包含：

- `users`：账号、密码哈希、salt。
- `sessions`：登录态 token 和过期时间。
- `user_data`：每个用户一份 JSON 数据。

项目不再包含找回密码表，也不会保存恢复密钥。

## 3. Cloudflare Pages 设置

创建 Pages 项目时使用：

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 如果项目在大仓库子目录中，填写这个项目所在的目录名
- Node version: 20 或更高

在 Pages 项目的 D1 bindings 中添加：

- Variable name: `DB`
- D1 database: 选择你的 `worklog-db`

## 4. 命令行部署

如果已经配置好 `wrangler.toml`，也可以直接部署：

```bash
npm run build
npx wrangler pages deploy dist --project-name worklog
```

部署成功后，Cloudflare 会给一个免费的 `*.pages.dev` 地址。手机端可以直接用 Safari/Chrome 打开，并添加到主屏幕。

部署后检查健康接口：

```bash
curl https://your-project.pages.dev/api/health
```

预期返回类似：

```json
{"ok":true,"service":"worklog","version":"0.1.0","time":"2026-06-18T00:00:00.000Z"}
```

## 5. 自定义域名

1. 在 Cloudflare 添加或购买域名。
2. 打开 Pages 项目。
3. 进入 Custom domains。
4. 添加域名或子域名，例如 `worklog.example.com`。
5. 按 Cloudflare 提示完成 DNS 配置。

## 6. 数据与隐私

- 未登录时，数据只存在当前浏览器的 `localStorage`。
- 登录后，记录、项目归档状态、目标、灵感、清单、报告设置、报告模板和模型服务商/地址/模型名会同步到 D1。
- 模型 API Key 只存在当前设备本地，不上传到 D1，也不会被 JSON 导出。
- 当前没有忘记密码找回。用户忘记密码时，管理员只能在 D1 删除该账号，让用户重新注册。
- `/api/health` 不访问数据库，只用于确认 Pages Functions 正常工作。

## 7. 常用维护命令

查看远程表：

```bash
npx wrangler d1 execute worklog-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

清空测试账号和数据：

```bash
npx wrangler d1 execute worklog-db --remote --command "DELETE FROM sessions; DELETE FROM user_data; DELETE FROM users;"
```

重新应用 schema：

```bash
npx wrangler d1 execute worklog-db --remote --file migrations/schema.sql
```

## 8. 后续可拓展

- 邮箱验证和密码找回：接入 Resend、Cloudflare Email Workers 或第三方身份服务。
- 多端冲突处理：记录级别的更新时间和合并策略。
- 数据加密：在客户端加密用户私密字段，再同步到云端。
- 团队版：多人空间、共享报告、权限控制。
