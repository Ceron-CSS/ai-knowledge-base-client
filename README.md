<div align="center">

# Agentic RAG Quality Engineering Platform — Client

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

<p>React + TypeScript + Vite frontend for comparing Workflow baselines, Agent Policy candidates, Trace evidence, and policy releases.</p>

</div>

---
## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 + shadcn-style UI primitives |
| Routing | React Router 7 (lazy loading + Suspense) |
| Data fetching | TanStack Query 5 |
| Primitives | @base-ui/react |
| Icons | lucide-react |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm |
| Password strength | @zxcvbn-ts |

## Product Flow

The frontend is organized around the Agentic RAG quality loop:

```text
Traceable knowledge base
  -> eval dataset and chunk labels
  -> Workflow baseline vs Agent Policy candidate
  -> quality / latency / cost comparison
  -> improved and regressed sample drilldown
  -> Agent Trace and original evidence
  -> validated Active Policy release
```

## Features

- **Auth**: JWT login, registration, GitHub OAuth, password change, and password-strength validation.
- **Layout**: Authenticated app shell with collapsible sidebar and light/dark theme toggle (shortcut `D`).
- **Home**: Current dashboard plus the target entry point for benchmark comparison and strategy validation.
- **Knowledge bases**: CRUD, enable/disable, sorting, linked-assistant checks, document upload, extraction preview, chunk preview, and original evidence drilldown.
- **Model providers**: Configuration for Aliyun Bailian, DeepSeek, and OpenAI-compatible providers.
- **Assistants**: Create/edit, model config, system prompt, publication state, and linked knowledge bases.
- **Assistant chat**: Conversation history, rename/delete, SSE streaming, citations, markdown rendering, image and document attachments.
- **Agent Runs**: Structured run records and Trace drawer for tool calls, retrieval decisions, fallback, latency, and errors.
- **Retrieval Debug**: Inspect retrieval behavior against selected knowledge bases and query settings.
- **Evaluation & Strategy**: Eval datasets, chunk labeling, async EvalRun progress, run details, baseline/candidate comparison, and Agent Policy management.
- **Onboarding**: First-run guided tour (`onboarding` module).

## Project Structure

```text
client/
|-- public/                      Static assets
|-- src/
|   |-- api/                     HTTP client and backend API wrappers
|   |   |-- http.ts              Shared requests, auth, error handling
|   |   |-- http-stream.ts       SSE / NDJSON stream parsers
|   |   |-- auth.ts              Login, register, password, OAuth
|   |   |-- kb.ts                Knowledge bases and documents
|   |   |-- assistants.ts        Q&A assistants
|   |   |-- assistantChat.ts     Conversations and streaming chat
|   |   |-- agentRuns.ts        Agent run traces
|   |   |-- evals.ts            Evaluation datasets, runs, compare, policies
|   |   |-- models.ts            Model provider configs
|   |   |-- stats.ts             Dashboard stats
|   |   `-- search.ts            Search
|   |-- app/                     App config and routing infrastructure
|   |   |-- router.tsx           Route definitions
|   |   |-- lazyPage.tsx         Page lazy-loading helper
|   |   |-- PageFallback.tsx     Route Suspense fallback
|   |   |-- queryClient.ts       React Query client
|   |   |-- env.ts               Environment variable helpers
|   |   `-- pages/               Route-level pages (404, errors; not business features)
|   |-- components/              Cross-feature shared components
|   |   |-- ui/                  Base UI component library
|   |   |-- ConfirmDeleteDialog.tsx
|   |   `-- theme-provider.tsx   Theme provider
|   |-- features/                Feature modules by domain
|   |   |-- auth/                Authentication and login
|   |   |-- layout/              App shell and sidebar
|   |   |-- home/                Home dashboard and quality-loop entry
|   |   |-- kb/                  Knowledge bases
|   |   |-- modelProviders/      Model providers
|   |   |-- assistants/          Q&A assistants
|   |   |-- assistantChat/       Assistant chat
|   |   |-- agentRuns/           Agent run list and trace entry
|   |   |-- retrievalDebug/      Retrieval debugging workbench
|   |   |-- evals/               Evaluation datasets, runs, compare, policies
|   |   `-- onboarding/          Onboarding tour
|   |-- hooks/                   Global hooks (e.g. debounce)
|   |-- lib/                     Shared utilities (e.g. cn)
|   |-- main.tsx                 App entry
|   `-- index.css                Global styles and theme tokens
|-- .env.example
|-- package.json
`-- vite.config.ts
```

## Architecture Conventions

### Feature Module Layout

Each `features/<name>/` directory is organized by responsibility:

```text
features/<name>/
|-- pages/           Route page components
|-- components/      Feature-scoped UI components
|-- hooks/           Page logic and React Query hooks
|-- lib/             Pure utility functions
|-- constants/       Static configuration
|-- types/           Type definitions
`-- index.ts         Public exports
```

Pages compose UI and hooks. Server state lives in `hooks/queries.ts` via TanStack Query. API types and request functions belong in `src/api/`.

### Path Alias

`@/` maps to `src/`, configured in `vite.config.ts`.

### State Management

- **Server state**: TanStack Query (lists, details, mutations, cache invalidation).
- **Auth state**: `AuthProvider` manages token and user context.
- **Local UI state**: `useState` / `useReducer` in components; complex form logic in custom hooks.

### Routing and Lazy Loading

- Routes are defined in `src/app/router.tsx`.
- Pages load on demand via `lazyPage()` with `Suspense` and `PageFallback`.
- Global 404 and route error pages live in `src/app/pages/` and are wired through `errorElement` and wildcard routes.
- Protected routes are wrapped in `RequireAuth` + `AppLayout`.

## UI Components

Base components live in `src/components/ui/` and are imported from `@/components/ui`:

| Component | Description |
| --- | --- |
| `Button` | Button with variants such as `primary`, `dialog-cancel` |
| `Input` | Single-line input with optional `clearable` button |
| `Textarea` | Multi-line input |
| `Select` | Dropdown select |
| `MultiSelect` | Multi-select dropdown |
| `Dialog` | Modal dialog |
| `Field` | Form field label + error container |
| `DataTable` | Data table |
| `Switch` | Toggle switch |
| `Breadcrumb` | Breadcrumb navigation |
| `Card` | Card container |
| `Chart` | Recharts wrapper |
| `LoadingText` | Loading text |
| `MarkdownMessage` | Markdown message renderer |
| `MessageCenter` / `message` | Global toast notifications |

## Getting Started

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The dev server runs at `http://localhost:5173` by default.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Backend API base URL, e.g. `http://localhost:3000` |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build production assets |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:ci` | Run Vitest once for CI |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run check` | Run lint + typecheck |
| `npm run format` | Format TS/TSX files with Prettier |

Current high-value tests cover SSE/NDJSON stream parsing, Workflow baseline vs Agent Policy
comparison release conclusions, and Chunk evidence navigation. These are the first regression
guards for the Evaluation & Strategy loop; browser-level Playwright smoke tests can be added later
without replacing these unit tests.

## Routes

| Path | Page | Auth |
| --- | --- | --- |
| `/login` | Login / registration / GitHub OAuth | No |
| `/` | Redirects to `/home` | Yes |
| `/home` | Dashboard | Yes |
| `/kb` | Knowledge base list | Yes |
| `/kb/:id` | Knowledge base detail and item list | Yes |
| `/kb/:id/items/:itemId` | Document detail and chunk evidence | Yes |
| `/kb/:id/upload` | Upload, extract, and chunk preview | Yes |
| `/model-providers` | Model provider configs | Yes |
| `/assistants` | Assistant list | Yes |
| `/assistants/:id` | Create or edit assistant (`new` for create) | Yes |
| `/assistants/:id/chat` | Assistant chat | Yes |
| `/agent-runs` | Agent run records and Trace entry | Yes |
| `/retrieval-debug` | Retrieval debugging workbench | Yes |
| `/evals` | Evaluation dataset list | Yes |
| `/evals/:datasetId` | Dataset detail, questions, labels, run history, trends | Yes |
| `/evals/runs/:runId` | EvalRun detail, progress, per-query results, Trace drilldown | Yes |
| `/evals/:datasetId/compare` | Workflow baseline vs Agent Policy candidate comparison | Yes |
| `/evals/policies` | Agent Policy center and activation flow | Yes |

## Backend Integration

All requests go through `src/api/http.ts`:

- Reads `VITE_API_BASE_URL` and builds request URLs.
- `authenticatedFetch` attaches `Authorization: Bearer <token>` when a token exists.
- Supports query serialization and `AbortSignal` cancellation.
- Normalizes JSON errors via `parseApiError` and `HttpError`.
- On `401`, clears the token and redirects to `/login` via `handleUnauthorized`.

Streaming and multipart requests reuse the same layer; parsers live in `src/api/http-stream.ts`:

| Scenario | API module | Protocol |
| --- | --- | --- |
| Chunk preview | `kb.ts` → `/kb/:id/chunk-preview` | NDJSON stream |
| Chat reply | `assistantChat.ts` → `.../messages/stream` | SSE |
| File upload | `kb.ts`, chat attachments | `FormData` |

The frontend expects the Python backend to expose `/auth`, `/kb`, `/assistants`, `/model-configs`, `/api/stats`, `/agent-runs`, `/evals`, and related endpoints.

## Demo vs Benchmark

The app can display fixed seed evaluation data created by `server-python/scripts/seed_eval_demo.py`. Use it for UI walkthroughs and screenshots only; its preset metrics are not real benchmark conclusions.

Real Benchmark results should come from live Retriever and Agent Runtime runs, with dataset version, policy snapshots, environment, per-query results, and exported reports. See `../docs/07-real-evaluation-and-demo-design.md`.

## Build Optimization

`vite.config.ts` configures `manualChunks` to split large dependencies (Recharts, Markdown, React Query, React Router, etc.) into separate chunks for a smaller initial bundle.

## Notes

- Chat image attachments are uploaded as data URLs before being sent in the streaming message payload.
- Document extraction supports file types implemented by the backend: TXT, Markdown, PDF, and DOCX.
- When adding features, create a module under `features/` and reuse primitives from `components/ui/`.
- Run `npm run check` before committing to catch lint and type errors.
