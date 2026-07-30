import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CardPosition, OnboardingStep } from "../types"

type OnboardingCardProps = {
  step: OnboardingStep
  index: number
  stepCount: number
  progress: number
  isFirst: boolean
  isLast: boolean
  position: CardPosition
  onSkip: () => void
  onPrevious: () => void
  onNext: () => void
}

export function OnboardingCard({
  step,
  index,
  stepCount,
  progress,
  isFirst,
  isLast,
  position,
  onSkip,
  onPrevious,
  onNext,
}: OnboardingCardProps) {
  return (
    <section
      className="fixed z-[52] rounded-lg border bg-background p-4 text-foreground shadow-xl"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      aria-label="新手引导"
    >
      <span
        className="absolute bg-background"
        style={
          position.arrow === "left"
            ? {
                left: -10,
                top: position.arrowOffset - 8,
                width: 10,
                height: 16,
                clipPath: "polygon(100% 0, 0 50%, 100% 100%)",
              }
            : {
                top: -10,
                left: position.arrowOffset - 8,
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
            {index + 1} / {stepCount}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="dialog-cancel" size="sm" onClick={onSkip}>
          跳过
        </Button>
        <Button type="button" variant="dialog-cancel" size="sm" disabled={isFirst} onClick={onPrevious}>
          <ChevronLeft data-icon="inline-start" />
          上一步
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={onNext}>
          {isLast ? (
            <>
              <CheckCircle2 data-icon="inline-start" />
              开始使用
            </>
          ) : (
            <>
              下一步
              <ChevronRight data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </section>
  )
}
