import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { workflowSteps } from "@/features/home/constants/workflowSteps"

export function WorkflowSection() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">系统工作流程</CardTitle>
        <CardDescription className="text-xs">从知识入库到 Agentic RAG 问答，再到评测优化的核心链路。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-5 md:gap-5">
          {workflowSteps.map(({ title, description, Icon }, index) => (
            <div key={title} className="relative">
              <div className="mx-auto flex min-h-20 w-full max-w-[23rem] items-center gap-2.5 rounded-md border bg-muted/20 px-2.5 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-primary ring-1 ring-foreground/10">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{title}</div>
                  <div className="text-xs leading-relaxed text-muted-foreground">{description}</div>
                </div>
              </div>
              {index < workflowSteps.length - 1 ? (
                <div className="pointer-events-none absolute -right-[22px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm md:flex">
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
