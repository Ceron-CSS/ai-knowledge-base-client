# AI Knowledge Base Client

[English](README.md) | [中文](README.zh-CN.md)

AI 知识库管理平台的前端项目，基于 React、TypeScript 和 Vite 构建。

## 技术栈

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4 + shadcn 风格 UI 基础组件
- React Router 7
- TanStack Query 5
- lucide-react 图标
- react-markdown + remark-gfm 用于聊天内容渲染
- Recharts 用于仪表盘图表

## 功能特性

- JWT 登录、注册、GitHub OAuth 登录和修改密码。
- 带可折叠侧边栏导航的登录后应用框架。
- 仪表盘指标，包括知识库、文档、助手、模型、请求趋势和文档分布。
- 知识库增删改查，支持启用/停用状态、排序和关联助手检查。
- 知识条目管理，支持上传、文本抽取、分块预览、自定义分块设置、编辑、启用/停用和删除。
- 模型服务商配置，支持阿里云百炼、DeepSeek 和 OpenAI 兼容服务商。
- 助手创建与编辑，支持模型配置、基础模型、系统提示词、发布状态和关联知识库。
- 助手聊天，支持会话历史、重命名/删除会话、SSE 流式响应、引用来源、Markdown 渲染、图片附件和文档抽取附件。

## 项目结构

```text
client/
|-- public/                  静态资源
|-- src/
|   |-- api/                 HTTP 客户端和后端 API 封装
|   |-- app/                 路由、查询客户端和环境变量工具
|   |-- components/          通用 UI 组件
|   |-- features/
|   |   |-- assistantChat/   助手聊天页面和查询逻辑
|   |   |-- assistants/      助手列表和编辑页面
|   |   |-- auth/            登录、认证 Provider、认证守卫
|   |   |-- home/            仪表盘页面
|   |   |-- kb/              知识库列表、详情、上传预览
|   |   |-- layout/          应用框架和侧边栏
|   |   |-- models/          模型服务商管理
|   |   |-- settings/        设置页占位
|   |-- hooks/               Toast/消息 hooks
|   |-- lib/                 通用工具
|   |-- main.tsx             应用入口
|   |-- index.css            全局样式和主题变量
|-- .env.example
|-- package.json
|-- vite.config.ts
```

## 快速开始

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

开发服务器会启动在 Vite 默认端口，通常是 `http://localhost:5173`。

## 环境变量

| 变量 | 是否必填 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 是 | 后端 API 基础地址，例如 `http://localhost:3000` |

## 脚本命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 执行类型检查并构建生产资源 |
| `npm run preview` | 预览生产构建结果 |
| `npm run lint` | 运行 ESLint |
| `npm run typecheck` | 运行 TypeScript 检查，不输出文件 |
| `npm run format` | 格式化 TypeScript 和 TSX 文件 |

## 路由

| 路径 | 页面 | 需要认证 |
| --- | --- | --- |
| `/login` | 登录 / 注册 / GitHub OAuth 入口 | 否 |
| `/` | 重定向到 `/home` | 是 |
| `/home` | 仪表盘 | 是 |
| `/kb` | 知识库列表 | 是 |
| `/kb/:id` | 知识库详情和条目列表 | 是 |
| `/kb/:id/upload` | 上传、抽取和分块预览流程 | 是 |
| `/models` | 模型服务商配置 | 是 |
| `/assistants` | 助手列表 | 是 |
| `/assistants/:id` | 创建或编辑助手 | 是 |
| `/assistants/:id/chat` | 助手聊天 | 是 |

## 后端集成

所有请求都会通过 `src/api/http.ts` 发送，它会：

- 读取 `VITE_API_BASE_URL`。
- 在存在 token 时附加 `Authorization: Bearer <token>`。
- 序列化查询参数。
- 通过 `HttpError` 统一 JSON 错误格式。
- 将未认证用户重定向回 `/login`。

流式和 multipart 流程会直接使用 `fetch`：

- `src/api/kb.ts` 从 `/kb/:id/chunk-preview` 以 NDJSON 形式流式接收分块预览响应。
- `src/api/assistantChat.ts` 从 `/assistants/:id/conversations/:conversationId/messages/stream` 以 SSE 形式流式接收聊天响应。
- 知识库上传和聊天附件使用 `FormData`。

## 说明

- 前端要求后端提供 `/auth`、`/kb`、`/assistants`、`/model-configs` 和 `/api/stats` 接口。
- 聊天图片附件会先以 data URL 形式上传，再发送到流式消息载荷中。
- 上传文档抽取支持后端已实现的文件类型：TXT、Markdown、PDF、DOC 和 DOCX。
