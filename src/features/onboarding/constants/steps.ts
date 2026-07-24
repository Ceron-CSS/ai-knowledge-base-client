import { BookOpen, Bot, Cpu, Home, Settings } from "lucide-react"
import type { OnboardingStep } from "../types"

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "首页",
    subtitle: "这里是平台总览入口。",
    Icon: Home,
    route: "/home",
    target: "nav-home",
    points: ["查看知识库、文档、助手和模型配置数量", "观察每日问答请求趋势", "从统计卡片快速进入常用模块"],
    action: "导览会先跳到首页，让你确认系统当前的数据概况。",
  },
  {
    title: "知识库",
    subtitle: "这里沉淀可被 AI 检索和引用的资料。",
    Icon: BookOpen,
    route: "/kb",
    target: "nav-kb",
    points: ["创建和启停知识库", "上传文档并预览解析结果", "管理文档条目，让问答更贴近业务内容"],
    action: "点击下一步会进入知识库页面，后续可以从这里开始导入资料。",
  },
  {
    title: "模型供应商",
    subtitle: "这里配置助手调用的大模型能力。",
    Icon: Cpu,
    route: "/models",
    target: "nav-models",
    points: ["维护 OpenAI 兼容的供应商配置", "设置 API 地址和密钥", "统一管理助手可选择的模型服务"],
    action: "发布助手前，需要先准备至少一个可用的模型供应商。",
  },
  {
    title: "问答助手",
    subtitle: "这里把知识库、提示词和模型组合成可用助手。",
    Icon: Bot,
    route: "/assistants",
    target: "nav-assistants",
    points: ["创建面向不同场景的助手", "绑定知识库并配置模型", "进入对话页面测试回答效果"],
    action: "配置完成后，进入聊天页用真实问题验证知识命中情况。",
  },
  {
    title: "设置",
    subtitle: "这里处理账号操作，也能重新打开导览。",
    Icon: Settings,
    route: "/home",
    target: "nav-settings",
    points: ["修改本地账号密码", "退出当前登录", "点击“新手引导”重新查看这套说明"],
    action: "以后忘记模块用途时，从左下角设置菜单可以随时重看。",
  },
]
