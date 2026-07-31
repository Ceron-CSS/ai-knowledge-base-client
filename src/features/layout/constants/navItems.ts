import { BookOpen, Bot, Cpu, Home, Search, type LucideIcon } from "lucide-react"

export type NavItem = {
  to: string
  label: string
  Icon: LucideIcon
  onboardingTarget: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/home", label: "首页", Icon: Home, onboardingTarget: "nav-home" },
  { to: "/kb", label: "知识库", Icon: BookOpen, onboardingTarget: "nav-kb" },
  { to: "/model-providers", label: "模型供应商", Icon: Cpu, onboardingTarget: "nav-model-providers" },
  { to: "/assistants", label: "问答助手", Icon: Bot, onboardingTarget: "nav-assistants" },
  { to: "/retrieval-debug", label: "召回调试台", Icon: Search, onboardingTarget: "nav-retrieval-debug" },
]
