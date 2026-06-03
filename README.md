# AI Knowledge Base Client

React + TypeScript + Vite frontend for the AI knowledge base management platform.

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4 + shadcn-style UI primitives
- React Router 7
- TanStack Query 5
- lucide-react icons
- react-markdown + remark-gfm for chat rendering
- Recharts for dashboard charts

## Features

- JWT login, registration, GitHub OAuth login, and password change.
- Authenticated app shell with collapsible sidebar navigation.
- Dashboard metrics for knowledge bases, documents, assistants, models, request trend, and document distribution.
- Knowledge base CRUD with enable/disable state, sorting, and linked-assistant checks.
- Knowledge item management with upload, text extraction, chunk preview, custom chunk settings, edit, enable/disable, and delete.
- Model provider configuration for Aliyun Bailian, DeepSeek, and OpenAI-compatible providers.
- Assistant creation/editing with model config, base model, system prompt, publication state, and linked knowledge bases.
- Assistant chat with conversation history, rename/delete conversation, SSE streaming responses, citations, markdown rendering, image attachments, and document extraction attachments.

## Project Structure

```text
client/
|-- public/                  Static assets
|-- src/
|   |-- api/                 HTTP client and backend API wrappers
|   |-- app/                 Router, query client, and env helpers
|   |-- components/          Shared UI components
|   |-- features/
|   |   |-- assistantChat/   Assistant chat page and queries
|   |   |-- assistants/      Assistant list and edit pages
|   |   |-- auth/            Login, auth provider, auth guards
|   |   |-- home/            Dashboard page
|   |   |-- kb/              Knowledge base list, detail, upload preview
|   |   |-- layout/          App shell/sidebar
|   |   |-- models/          Model provider management
|   |   |-- settings/        Settings placeholder
|   |-- hooks/               Toast/message hooks
|   |-- lib/                 Shared utilities
|   |-- main.tsx             App entry
|   |-- index.css            Global styles and theme tokens
|-- .env.example
|-- package.json
|-- vite.config.ts
```

## Getting Started

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The dev server starts on Vite's default port, usually `http://localhost:5173`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Backend API base URL, for example `http://localhost:3000` |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build production assets |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run format` | Format TypeScript and TSX files |

## Routes

| Path | Page | Auth |
| --- | --- | --- |
| `/login` | Login / registration / GitHub OAuth entry | No |
| `/` | Redirects to `/home` | Yes |
| `/home` | Dashboard | Yes |
| `/kb` | Knowledge base list | Yes |
| `/kb/:id` | Knowledge base detail and item list | Yes |
| `/kb/:id/upload` | Upload/extract/chunk preview workflow | Yes |
| `/models` | Model provider configs | Yes |
| `/assistants` | Assistant list | Yes |
| `/assistants/:id` | Create or edit assistant | Yes |
| `/assistants/:id/chat` | Assistant chat | Yes |

## Backend Integration

All requests are sent through `src/api/http.ts`, which:

- Reads `VITE_API_BASE_URL`.
- Attaches `Authorization: Bearer <token>` when a token exists.
- Serializes query parameters.
- Normalizes JSON errors through `HttpError`.
- Redirects unauthenticated users back to `/login`.

Streaming and multipart flows use `fetch` directly:

- `src/api/kb.ts` streams chunk preview responses from `/kb/:id/chunk-preview` as NDJSON.
- `src/api/assistantChat.ts` streams chat responses from `/assistants/:id/conversations/:conversationId/messages/stream` as SSE.
- Knowledge uploads and chat attachments use `FormData`.

## Notes

- The frontend expects the backend to expose `/auth`, `/kb`, `/assistants`, `/model-configs`, and `/api/stats`.
- Chat image attachments are uploaded as data URLs before being sent in the streaming message payload.
- Uploaded document extraction supports the file types implemented by the backend: TXT, Markdown, PDF, DOC, and DOCX.
