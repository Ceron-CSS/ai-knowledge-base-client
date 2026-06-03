import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useLocation, useNavigate } from "react-router-dom"
import {
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Home,
  Settings,
  type LucideIcon,
} from "lucide-react"

type OnboardingStep = {
  title: string
  subtitle: string
  Icon: LucideIcon
  points: string[]
  action: string
  route: string
  target: string
}

type Rect = {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

type CardPosition = {
  top: number
  left: number
  width: number
  arrow: "left" | "top"
  arrowOffset: number
}

const steps: OnboardingStep[] = [
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

function readTargetRect(target: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-onboarding-target="${target}"]`)
  if (!el) return null
  el.scrollIntoView({ block: "nearest", inline: "nearest" })
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

function getCardPosition(rect: Rect | null): CardPosition {
  const gap = 16
  const margin = 16
  const width = Math.min(440, Math.max(300, window.innerWidth - margin * 2))

  if (!rect) {
    return {
      top: Math.max(margin, (window.innerHeight - 360) / 2),
      left: Math.max(margin, (window.innerWidth - width) / 2),
      width,
      arrow: "top",
      arrowOffset: 32,
    }
  }

  const hasRoomRight = rect.right + gap + width <= window.innerWidth - margin
  const maxTop = Math.max(margin, window.innerHeight - 360)
  const top = Math.min(Math.max(rect.top - 8, margin), maxTop)

  if (hasRoomRight) {
    const arrowOffset = Math.min(Math.max(rect.top + rect.height / 2 - top, 36), 324)
    return {
      top: Math.max(top, margin),
      left: rect.right + gap,
      width,
      arrow: "left",
      arrowOffset,
    }
  }

  const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin)
  const arrowOffset = Math.min(Math.max(rect.left + rect.width / 2 - left, 32), width - 32)

  return {
    top: Math.min(Math.max(rect.bottom + gap, margin), maxTop),
    left,
    width,
    arrow: "top",
    arrowOffset,
  }
}

export function OnboardingGuide({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [index, setIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === steps.length - 1
  const progress = useMemo(() => Math.round(((index + 1) / steps.length) * 100), [index])
  const cardPosition = useMemo(() => getCardPosition(targetRect), [targetRect])

  const closeAndComplete = useCallback(() => {
    onComplete()
    onOpenChange(false)
    setIndex(0)
  }, [onComplete, onOpenChange])

  const goPrevious = useCallback(() => {
    setIndex((v) => Math.max(0, v - 1))
  }, [])

  const goNext = useCallback(() => {
    if (isLast) {
      closeAndComplete()
      return
    }
    setIndex((v) => Math.min(steps.length - 1, v + 1))
  }, [closeAndComplete, isLast])

  const refreshTargetRect = useCallback(() => {
    if (!open) return
    window.requestAnimationFrame(() => {
      setTargetRect(readTargetRect(step.target))
    })
  }, [open, step.target])

  useEffect(() => {
    if (!open) return
    if (location.pathname !== step.route) {
      navigate(step.route)
    }
  }, [location.pathname, navigate, open, step.route])

  useEffect(() => {
    refreshTargetRect()
  }, [location.pathname, refreshTargetRect])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAndComplete()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrevious()
    }
    function onViewportChange() {
      refreshTargetRect()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("resize", onViewportChange)
    window.addEventListener("scroll", onViewportChange, true)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", onViewportChange)
      window.removeEventListener("scroll", onViewportChange, true)
    }
  }, [closeAndComplete, goNext, goPrevious, open, refreshTargetRect])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/45" />

      {targetRect ? (
        <div
          className="pointer-events-none fixed z-[51] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      ) : null}

      <section
        className="fixed z-[52] rounded-lg border bg-background p-4 text-foreground shadow-xl"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          width: cardPosition.width,
        }}
        aria-label="新手引导"
      >
        <span
          className="absolute bg-background"
          style={
            cardPosition.arrow === "left"
              ? {
                  left: -10,
                  top: cardPosition.arrowOffset - 8,
                  width: 10,
                  height: 16,
                  clipPath: "polygon(100% 0, 0 50%, 100% 100%)",
                }
              : {
                  top: -10,
                  left: cardPosition.arrowOffset - 8,
                  width: 16,
                  height: 10,
                  clipPath: "polygon(0 100%, 50% 0, 100% 100%)",
                }
          }
        />

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <step.Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold">{step.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.subtitle}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {step.points.map((point) => (
            <div key={point} className="flex gap-2 text-sm leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{point}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          {step.action}
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {index + 1} / {steps.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60"
            onClick={closeAndComplete}
          >
            跳过
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isFirst}
            onClick={goPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
            上一步
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            onClick={goNext}
          >
            {isLast ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                开始使用
              </>
            ) : (
              <>
                下一步
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
