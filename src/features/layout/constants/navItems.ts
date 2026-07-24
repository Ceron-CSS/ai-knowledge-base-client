import { BookOpen, Bot, Cpu, Home, type LucideIcon } from "lucide-react"

export type NavItem = {
  to: string
  label: string
  Icon: LucideIcon
  onboardingTarget: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/home", label: "首页", Icon: Home, onboardingTarget: "nav-home" },
  { to: "/kb", label: "知识库", Icon: BookOpen, onboardingTarget: "nav-kb" },
  { to: "/models", label: "模型供应商", Icon: Cpu, onboardingTarget: "nav-models" },
  { to: "/assistants", label: "问答助手", Icon: Bot, onboardingTarget: "nav-assistants" },
]
