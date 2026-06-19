# Product Notes

WorkLog 的核心假设是：普通人不是缺少记录工具，而是缺少把碎片变成可复盘材料的轻量流程。

## Target User

- 每天有零散工作推进、待办、风险和生活安排的人。
- 希望报告整理能少花时间，但又不想把所有内容交给大型知识库的人。
- 愿意自带模型 API Key，控制自己的成本和模型选择的人。

## Core Loop

1. 用户在日历页点击右下角新增记录。
2. 选择 `work`、`todo`、`risk`、`note` 或 `life`。
3. 可直接保存，也可选择 DeepSeek 等服务商后让 AI 润色。
4. 记录进入当天日历。
5. 日历页提示本周复盘材料，并可一键生成周报。
6. 用户可生成今日、本周、项目或报告点评，检查风险闭环、待办密度、缺失证据和职业素材潜力。
7. 项目页自动聚合项目进展、风险、待跟进和关联目标。
8. 用户可对项目重命名、归档，并按项目进入报告。
9. 目标、灵感、清单作为报告材料进入阶段总结。
10. 报告页按报告类型、时间范围、项目范围、材料选择和模板自动整理。

## Information Architecture

- 日历：每日记录入口、回看入口、本周复盘入口，并承载今日/本周 AI 点评。
- 项目：将记录里的项目名变成可追踪对象，用搜索和状态筛选管理大量项目，展示进展、待办、风险、关联目标，并支持重命名、归档、项目点评和快速生成项目报告。
- 报告：将记录按报告类型、时间范围、项目范围、材料选择和模板转成可复制文本，并支持对报告质量做 AI 点评。
- 心愿：长期目标、阶段目标、灵感、想做清单，并提供报告材料汇总入口。
- 设置：云同步、本地模型配置、模型连接测试、数据迁移、版本信息。

## Material Flow

- Goals can be converted into todo records.
- Ideas can be converted into note records.
- Wishlist items can be converted into todo records.
- Active goals, ideas, and wishlist items can be injected into report templates.
- The calendar and wishlist pages surface report material counts so review is part of the daily loop.
- Projects are inferred from record project names and can surface related active goals when text matches.
- Reviews can be generated from daily entries, weekly entries, project entries, or a report draft. They highlight progress quality, risk closure, missing evidence, next actions, and career-material potential.

## Data Boundary

Local-only:

- Model API Key.

Cloud-synced when logged in:

- Entries.
- Project archive metadata.
- Goals.
- Ideas.
- Wishes.
- Report kind and material toggles.
- Report template.
- Generated review notes.
- Model provider, endpoint, and model name.

Never synced:

- Exported backup files.
- Local browser storage outside WorkLog's own keys.
