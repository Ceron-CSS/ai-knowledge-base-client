# AI Knowledge Base — Client

React + TypeScript + Vite frontend for the AI knowledge base platform.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build**: Vite 7
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Routing**: react-router-dom v7
- **Data**: @tanstack/react-query v5
- **Icons**: lucide-react
- **UI primitives**: @base-ui/react

## Directory Structure

```
client/
├── src/
│   ├── main.tsx                  # App entry
│   ├── index.css                 # Global styles & theme
│   ├── app/
│   │   ├── router.tsx            # Route definitions
│   │   ├── queryClient.ts        # React Query client
│   │   └── env.ts                # Environment helpers
│   ├── api/
│   │   ├── http.ts               # HTTP client (base URL, auth, errors)
│   │   ├── auth.ts               # Login / change password
│   │   ├── kb.ts                 # Knowledge bases
│   │   ├── assistants.ts         # Assistants
│   │   ├── assistantChat.ts      # Chat conversations & SSE streaming
│   │   ├── models.ts             # Model provider configs
│   │   ├── entry.ts              # Knowledge entries (TODO)
│   │   ├── import.ts             # Import (TODO)
│   │   ├── search.ts             # Semantic search (TODO)
│   │   └── chat.ts               # General chat (TODO)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx        # Single-select dropdown
│   │   │   └── multi-select.tsx  # Multi-select with search
│   │   ├── ConfirmDeleteDialog.tsx
│   │   └── theme-provider.tsx
│   ├── features/
│   │   ├── auth/                 # Login, RequireAuth, AuthProvider
│   │   ├── kb/                   # Knowledge base list & detail
│   │   ├── assistants/           # Assistant list & edit
│   │   ├── assistantChat/        # Assistant chat page
│   │   ├── models/               # Model provider management
│   │   ├── chat/                 # General chat (TODO)
│   │   ├── entry/                # Knowledge entries (TODO)
│   │   ├── import/               # Import (TODO)
│   │   ├── search/               # Semantic search (TODO)
│   │   ├── settings/             # Password change & logout
│   │   └── layout/               # App sidebar layout
│   └── lib/
│       ├── utils.ts
│       └── useDebouncedValue.ts
├── .env.example
├── index.html
├── vite.config.ts
└── package.json
```

## Getting Started

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base URL |

## Routes

| Path | Page | Auth |
|------|------|------|
| `/login` | Login | No |
| `/kb` | Knowledge base list | Yes |
| `/kb/:id` | KB detail (WIP) | Yes |
| `/models` | Model provider configs | Yes |
| `/assistants` | Assistant list | Yes |
| `/assistants/new` | Create assistant | Yes |
| `/assistants/:id` | Edit assistant | Yes |
| `/assistants/:id/chat` | Assistant chat | Yes |
| `/chat` | General chat (TODO) | Yes |
| `/entry` | Knowledge entries (TODO) | Yes |
| `/import` | Import (TODO) | Yes |
| `/search` | Semantic search (TODO) | Yes |
| `/settings` | Password & logout | Yes |

## Key Features

- **Auth** — JWT login, GitHub OAuth login, token stored in localStorage, auto-attached to all API requests
- **Knowledge Bases** — Create, edit, enable/disable, delete with cascade warnings
- **Model Providers** — Configure API credentials per provider (DashScope, DeepSeek), one config per provider
- **Assistants** — Compose AI assistants with model selection, system prompt, multi-KB linking
- **Assistant Chat** — Real-time SSE streaming chat with conversation history
- **Multi-Select** — Custom dropdown with search & tags for KB association
- **Placeholder color** — Global `::placeholder` style tuned for readability
