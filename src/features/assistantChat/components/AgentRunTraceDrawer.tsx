import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { getAgentRun, type AgentRunDetail } from "@/api/agentRuns"
import { Button } from "@/components/ui/button"
import {
  AgentRunTraceContent,
  buildEvalFallbackSteps,
  decisionLabel,
  stepLabel,
  stepToolBadge,
  visibleTimelineSteps,
  type TimelineStep,
} from "@/features/agentRuns/components/AgentRunTraceContent"

type AgentRunTraceDrawerProps = {
  runId: string | null
  open: boolean
  onClose: () => void
  showAnswerResult?: boolean
}

export {
  buildEvalFallbackSteps,
  decisionLabel,
  stepLabel,
  stepToolBadge,
  visibleTimelineSteps,
  type TimelineStep,
}

export function AgentRunTraceDrawer({
  runId,
  open,
  onClose,
  showAnswerResult = true,
}: AgentRunTraceDrawerProps) {
  const [detail, setDetail] = useState<AgentRunDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !runId) return

    let cancelled = false
    let timer: number | undefined

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const next = await getAgentRun(runId!)
        if (cancelled) return
        setDetail(next)
        if (next.status === "running") {
          timer = window.setTimeout(() => {
            void load()
          }, 2000)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [open, runId])

  if (!open) return null
  if (typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">执行详情</h2>
            <p className="text-xs text-muted-foreground">{runId}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          <AgentRunTraceContent
            runId={runId}
            detail={detail}
            loading={loading}
            error={error}
            showAnswerResult={showAnswerResult}
          />
        </div>
      </aside>
    </div>,
    document.body,
  )
}
