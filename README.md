# React + TypeScript + Vite + shadcn/ui

This is a template for a new Vite project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## 工程规范（前端）

- 路由：`react-router-dom`（`src/app/router.tsx`）
- 请求/缓存：`@tanstack/react-query`（`src/app/queryClient.ts`）
- 目录：按业务拆分到 `src/features/*`
- 环境变量：`VITE_API_BASE_URL`（见 `.env`）

## API 层

- 统一封装：`src/api/http.ts`（`baseURL`、token、统一错误）
- 分模块：`src/api/{auth,kb,entry,import,search,chat}.ts`
