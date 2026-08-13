<div align="center">

# Agentic RAG 质量工程平台 — Client

<p>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" /></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://reactrouter.com/"><img src="https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white" alt="React Router" /></a>
  <a href="https://tanstack.com/query"><img src="https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white" alt="TanStack Query" /></a>
</p>

<p>
  <a href="README.md">English</a>
  ·
  <a href="README.zh-CN.md">中文</a>
</p>

<p>用于对比 Workflow baseline、Agent Policy candidate、Trace 证据和策略发布的 React + TypeScript + Vite 前端。</p>

</div>

---
## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | React 19 + TypeScript |
| 构建 | Vite 7 |
| 样式 | Tailwind CSS 4 + shadcn 风格 UI 组件 |
| 路由 | React Router 7（懒加载 + Suspense） |
| 数据请求 | TanStack Query 5 |
| 基础组件 | @base-ui/react |
| 图标 | lucide-react |
| 图表 | Recharts |
| Markdown | react-markdown + remark-gfm |
| 密码强度 | @zxcvbn-ts |

## 产品主流程

前端围绕 Agentic RAG 质量闭环组织：

```text
可追溯知识底座
  -> 评测数据集与 Chunk 标注
  -> Workflow baseline 对比 Agent Policy candidate
  -> 质量 / 延迟 / 成本对比
  -> improved / regressed 样本下钻
  -> Agent Trace 与原文证据
  -> 发布验证通过的 Active Policy
```

## 功能特性

- **认证**：JWT 登录、注册、GitHub OAuth、修改密码与密码强度校验。
- **布局**：登录后应用框架，可折叠侧边栏导航，支持明暗主题切换（快捷键 `D`）。
- **首页**：当前提供知识库、文档、助手、模型和请求趋势统计，目标入口是最近 Benchmark 对比与策略验证工作台。
- **知识库**：增删改查，启用/停用，排序，关联助手检查，文档上传、抽取预览、Chunk 预览和原文证据下钻。
- **模型供应商**：阿里云百炼、DeepSeek、OpenAI 兼容服务商配置。
- **问答助手**：创建/编辑、模型配置、系统提示词、发布状态、关联知识库。
- **助手聊天**：会话历史、重命名/删除、SSE 流式响应、引用来源、Markdown 渲染、图片与文档附件。
- **Agent Runs**：结构化运行记录与 Trace 入口，查看工具调用、检索决策、fallback、耗时和错误。
- **Retrieval Debug**：围绕指定知识库和查询参数检查召回行为。
- **评测与策略**：评测数据集、Chunk 标注、异步 EvalRun 进度、运行详情、baseline/candidate 对比和 Agent Policy 管理。
- **新手引导**：首次使用时的页面引导（`onboarding` 模块）。

## 项目结构

```text
client/
|-- public/                      静态资源
|-- src/
|   |-- api/                     HTTP 客户端与后端 API 封装
|   |   |-- http.ts              通用请求、鉴权、错误处理
|   |   |-- http-stream.ts       SSE / NDJSON 流式解析
|   |   |-- auth.ts              登录、注册、改密、OAuth
|   |   |-- kb.ts                知识库与文档
|   |   |-- assistants.ts        问答助手
|   |   |-- assistantChat.ts     会话与流式聊天
|   |   |-- agentRuns.ts        Agent 运行 Trace
|   |   |-- evals.ts            评测数据集、运行、对比与策略
|   |   |-- models.ts            模型供应商配置
|   |   |-- stats.ts             仪表盘统计
|   |   `-- search.ts            搜索
|   |-- app/                     应用级配置与路由基础设施
|   |   |-- router.tsx           路由定义
|   |   |-- lazyPage.tsx         页面懒加载工具
|   |   |-- PageFallback.tsx     路由 Suspense 占位
|   |   |-- queryClient.ts       React Query 客户端
|   |   |-- env.ts               环境变量读取
|   |   `-- pages/               路由级页面（404、错误页，非业务 feature）
|   |-- components/              跨功能复用组件
|   |   |-- ui/                  基础 UI 组件库
|   |   |-- ConfirmDeleteDialog.tsx
|   |   `-- theme-provider.tsx   主题 Provider
|   |-- features/                按业务域划分的功能模块
|   |   |-- auth/                认证与登录
|   |   |-- layout/              应用框架与侧边栏
|   |   |-- home/                首页仪表盘与质量闭环入口
|   |   |-- kb/                  知识库
|   |   |-- modelProviders/      模型供应商
|   |   |-- assistants/          问答助手
|   |   |-- assistantChat/       助手聊天
|   |   |-- agentRuns/           Agent 运行列表与 Trace 入口
|   |   |-- retrievalDebug/      召回调试工作台
|   |   |-- evals/               评测数据集、运行、对比与策略
|   |   `-- onboarding/          新手引导
|   |-- hooks/                   全局 hooks（如防抖）
|   |-- lib/                     通用工具（如 cn）
|   |-- main.tsx                 应用入口
|   `-- index.css                全局样式与主题变量
|-- .env.example
|-- package.json
`-- vite.config.ts
```

## 架构约定

### Feature 模块组织

每个 `features/<name>/` 目录按职责拆分，常见结构如下：

```text
features/<name>/
|-- pages/           路由页面组件
|-- components/      仅该功能使用的 UI 组件
|-- hooks/           页面逻辑与 React Query hooks
|-- lib/             纯函数工具
|-- constants/       常量配置
|-- types/           类型定义
`-- index.ts         对外导出入口
```

页面组件负责组合 UI 与 hooks；数据请求通过 `hooks/queries.ts` 封装 TanStack Query；与后端交互的类型和请求函数放在 `src/api/`。

### 路径别名

`@/` 映射到 `src/`，在 `vite.config.ts` 中配置。

### 状态管理

- **服务端状态**：TanStack Query（列表、详情、变更、缓存失效）。
- **认证状态**：`AuthProvider` 管理 token 与用户信息。
- **本地 UI 状态**：组件内 `useState` / `useReducer`，复杂表单逻辑抽到自定义 hook。

### 路由与懒加载

- 路由定义在 `src/app/router.tsx`。
- 页面通过 `lazyPage()` 按需加载，配合 `Suspense` 显示 `PageFallback`。
- 404 / 路由错误等全局异常页放在 `src/app/pages/`，由 `errorElement` 与通配路由引用。
- 需登录的路由包裹在 `RequireAuth` + `AppLayout` 下。

## UI 组件

基础组件位于 `src/components/ui/`，统一从 `@/components/ui` 导入：

| 组件 | 说明 |
| --- | --- |
| `Button` | 按钮，含 `primary`、`dialog-cancel` 等变体 |
| `Input` | 单行输入，支持 `clearable` 清除按钮 |
| `Textarea` | 多行输入 |
| `Select` | 下拉选择 |
| `MultiSelect` | 多选下拉 |
| `Dialog` | 弹窗 |
| `Field` | 表单字段标签 + 错误信息容器 |
| `DataTable` | 数据表格 |
| `Switch` | 开关 |
| `Breadcrumb` | 面包屑 |
| `Card` | 卡片容器 |
| `Chart` | Recharts 图表封装 |
| `LoadingText` | 加载文案 |
| `MarkdownMessage` | Markdown 消息渲染 |
| `MessageCenter` / `message` | 全局 Toast 提示 |

## 快速开始

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。

## 环境变量

| 变量 | 是否必填 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 是 | 后端 API 基础地址，例如 `http://localhost:3000` |

## 脚本命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 类型检查并构建生产资源 |
| `npm run preview` | 预览生产构建结果 |
| `npm run lint` | 运行 ESLint |
| `npm run test` | 以 watch 模式运行 Vitest |
| `npm run test:ci` | 在 CI 中单次运行 Vitest |
| `npm run typecheck` | 运行 TypeScript 检查（不输出文件） |
| `npm run check` | 依次执行 lint + typecheck |
| `npm run format` | 使用 Prettier 格式化 TS/TSX 文件 |

## 路由

| 路径 | 页面 | 需要认证 |
| --- | --- | --- |
| `/login` | 登录 / 注册 / GitHub OAuth | 否 |
| `/` | 重定向到 `/home` | 是 |
| `/home` | 首页仪表盘 | 是 |
| `/kb` | 知识库列表 | 是 |
| `/kb/:id` | 知识库详情与条目列表 | 是 |
| `/kb/:id/items/:itemId` | 文档详情与 Chunk 证据 | 是 |
| `/kb/:id/upload` | 上传、抽取与分块预览 | 是 |
| `/model-providers` | 模型供应商配置 | 是 |
| `/assistants` | 问答助手列表 | 是 |
| `/assistants/:id` | 创建或编辑助手（`new` 为新建） | 是 |
| `/assistants/:id/chat` | 助手聊天 | 是 |
| `/agent-runs` | Agent 运行记录与 Trace 入口 | 是 |
| `/retrieval-debug` | 召回调试工作台 | 是 |
| `/evals` | 评测数据集列表 | 是 |
| `/evals/:datasetId` | 数据集详情、问题、标注、运行历史和趋势 | 是 |
| `/evals/runs/:runId` | EvalRun 详情、进度、逐题结果和 Trace 下钻 | 是 |
| `/evals/:datasetId/compare` | Workflow baseline 与 Agent Policy candidate 对比 | 是 |
| `/evals/policies` | Agent Policy 中心与激活流程 | 是 |

## 后端集成

所有请求通过 `src/api/http.ts` 发送：

- 读取 `VITE_API_BASE_URL` 拼接请求 URL。
- `authenticatedFetch` 在存在 token 时附加 `Authorization: Bearer <token>`。
- 支持查询参数序列化、`AbortSignal` 取消。
- 通过 `parseApiError` 和 `HttpError` 统一 JSON 错误格式。
- `401` 时通过 `handleUnauthorized` 清除 token 并重定向到 `/login`。

流式与 multipart 请求复用同一层，解析逻辑在 `src/api/http-stream.ts`：

| 场景 | API 模块 | 协议 |
| --- | --- | --- |
| 分块预览 | `kb.ts` → `/kb/:id/chunk-preview` | NDJSON 流 |
| 聊天回复 | `assistantChat.ts` → `.../messages/stream` | SSE |
| 文件上传 | `kb.ts`、聊天附件 | `FormData` |

前端依赖 Python 后端提供 `/auth`、`/kb`、`/assistants`、`/model-configs`、`/api/stats`、`/agent-runs`、`/evals` 等接口。

## Demo 与 Benchmark 边界

前端可以展示 `server-python/scripts/seed_eval_demo.py` 生成的固定种子评测数据。这类数据只用于 UI 演示、截图和冒烟检查，预设指标不能作为真实性能结论。

真实 Benchmark 必须来自真实 Retriever 与线上 Agent Runtime，报告应包含数据版本、Policy 快照、运行环境、逐问题结果和导出产物。详细设计见 `../docs/07-real-evaluation-and-demo-design.md`。

## 构建优化

`vite.config.ts` 中配置了 `manualChunks`，将 Recharts、Markdown、React Query、React Router 等大型依赖拆分为独立 chunk，减小首屏加载体积。

## 开发说明

- 聊天图片附件先以 data URL 上传，再发送到流式消息载荷。
- 文档抽取支持后端已实现的文件类型：TXT、Markdown、PDF、DOCX。
- 新增功能时，优先在 `features/` 下创建模块，复用 `components/ui/` 中的基础组件。
- 提交前建议执行 `npm run check` 确保无 lint 与类型错误。
