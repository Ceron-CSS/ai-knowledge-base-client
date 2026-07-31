import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return

          if (id.includes("recharts") || id.includes("d3-")) return "recharts"
          if (
            id.includes("react-markdown") ||
            id.includes("remark-") ||
            id.includes("micromark") ||
            id.includes("mdast-") ||
            id.includes("unist-")
          ) {
            return "markdown"
          }
          if (id.includes("@zxcvbn-ts")) return "zxcvbn"
          if (id.includes("@tanstack/react-query")) return "react-query"
          if (id.includes("react-router") || id.includes("@remix-run/router")) return "react-router"
          if (id.includes("lucide-react")) return "lucide"
          if (id.includes("react-dom") || /\/react\//.test(id)) return "react"
        },
      },
    },
  },
})
