import {
  Activity,
  BookOpen,
  Bot,
  Cpu,
  FlaskConical,
  Home,
  Search,
  Shield,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  to: string
  label: string
  Icon: LucideIcon
  onboardingTarget: string
}

export type NavGroup = {
  id: string
  /** Empty string = no section header */
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "",
    items: [{ to: "/home", label: "首页", Icon: Home, onboardingTarget: "nav-home" }],
  },
  {
    id: "knowledge",
    label: "知识",
    items: [
      { to: "/kb", label: "知识库", Icon: BookOpen, onboardingTarget: "nav-kb" },
      { to: "/assistants", label: "问答助手", Icon: Bot, onboardingTarget: "nav-assistants" },
    ],
  },
  {
    id: "compute",
    label: "模型",
    items: [
      {
        to: "/model-providers",
        label: "模型提供商",
        Icon: Cpu,
        onboardingTarget: "nav-model-providers",
      },
    ],
  },
  {
    id: "observability",
    label: "观测",
    items: [
      {
        to: "/agent-runs",
        label: "运行记录",
        Icon: Activity,
        onboardingTarget: "nav-agent-runs",
      },
      {
        to: "/retrieval-debug",
        label: "召回调试台",
        Icon: Search,
        onboardingTarget: "nav-retrieval-debug",
      },
      {
        to: "/evals",
        label: "评测与优化",
        Icon: FlaskConical,
        onboardingTarget: "nav-evals",
      },
      {
        to: "/evals/policies",
        label: "Agent 策略中心",
        Icon: Shield,
        onboardingTarget: "nav-agent-policies",
      },
    ],
  },
]

/** Flat list for callers that only need routes (e.g. onboarding). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)
