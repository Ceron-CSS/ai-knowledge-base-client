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
    ],
  },
  {
    id: "application",
    label: "应用",
    items: [
      { to: "/assistants", label: "问答助手", Icon: Bot, onboardingTarget: "nav-assistants" },
    ],
  },
  {
    id: "evaluation",
    label: "评测与策略",
    items: [
      {
        to: "/evals",
        label: "评测数据集",
        Icon: FlaskConical,
        onboardingTarget: "nav-evals",
      },
      {
        to: "/evals/policies",
        label: "Agent Policy",
        Icon: Shield,
        onboardingTarget: "nav-agent-policies",
      },
    ],
  },
  {
    id: "observability",
    label: "观测与调试",
    items: [
      {
        to: "/agent-runs",
        label: "Agent Runs",
        Icon: Activity,
        onboardingTarget: "nav-agent-runs",
      },
      {
        to: "/retrieval-debug",
        label: "召回调试台",
        Icon: Search,
        onboardingTarget: "nav-retrieval-debug",
      },
    ],
  },
  {
    id: "system",
    label: "系统",
    items: [
      {
        to: "/model-providers",
        label: "模型供应商",
        Icon: Cpu,
        onboardingTarget: "nav-model-providers",
      },
    ],
  },
]

/** Flat list for callers that only need routes (e.g. onboarding). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)
