import { useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react"
import {
  summarizeCompletedProcess,
  type RunProcess,
  type RunProcessStep,
} from "@/features/assistantChat/lib/runProcess"

type RunProcessPanelProps = {
  process: RunProcess
  title?: string
  defaultOpen?: boolean
  testId?: string
}

export function RunProcessPanel({
  process,
  title = "思考过程",
  defaultOpen,
  testId,
}: RunProcessPanelProps) {
  const isComplete =
    process.status === "succeeded" || process.status === "failed"
  const [open, setOpen] = useState(defaultOpen ?? !isComplete)
  if (process.steps.length === 0) return null
  return (
    <details
      className="group rounded-md border border-border/80 bg-background/60 px-3 py-2 text-xs"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      data-testid={testId}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="font-medium text-foreground">
          {isComplete ? summarizeCompletedProcess(process) : title}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      {open ? (
        <ol className="mt-2 space-y-2">
          {process.steps.map((step) => (
            <ProcessRow key={step.id} step={step} />
          ))}
        </ol>
      ) : null}
    </details>
  )
}

function ProcessRow({ step }: { step: RunProcessStep }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5 shrink-0">{statusIcon(step.status)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-foreground">{step.title}</span>
          {step.durationMs != null ? (
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {formatDuration(step.durationMs)}
            </span>
          ) : null}
        </div>
        {step.detail
          ? step.detail.split("\n").map((line) => (
              <div
                key={line}
                className="mt-0.5 break-words text-muted-foreground"
              >
                {line}
              </div>
            ))
          : null}
      </div>
    </li>
  )
}

function statusIcon(status: RunProcessStep["status"]) {
  if (status === "running")
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
  if (status === "succeeded")
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
  if (status === "failed" || status === "rejected")
    return <XCircle className="h-3.5 w-3.5 text-destructive" />
  return <Circle className="h-3.5 w-3.5 text-muted-foreground" />
}

function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "-"
  if (ms < 1) return "<1 ms"
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} 秒`
}
