import { Suspense, lazy } from "react"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody } from "@/components/ui/page-header"
import { DashboardStatCards } from "@/features/home/components/DashboardStatCards"
import { StrategyWorkbenchSection } from "@/features/home/components/StrategyWorkbenchSection"
import { TechStackSection } from "@/features/home/components/TechStackSection"
import { WorkflowSection } from "@/features/home/components/WorkflowSection"
import { useDashboardStats } from "@/features/home/hooks/queries"

const DailyRequestsChart = lazy(() =>
  import("@/features/home/components/DailyRequestsChart").then((module) => ({ default: module.DailyRequestsChart })),
)
const KbDocDistChart = lazy(() =>
  import("@/features/home/components/KbDocDistChart").then((module) => ({ default: module.KbDocDistChart })),
)

function hasKbDocDistData(kbDocDist: { docCount: number }[]) {
  return kbDocDist.some((item) => item.docCount > 0)
}

export function HomePage() {
  const stats = useDashboardStats()
  const data = stats.data

  if (stats.isLoading) {
    return (
      <Page>
        <PageBody>
          <div className="flex rounded-lg border border-border bg-card px-4 py-10 shadow-sm">
            <LoadingText className="mx-auto">加载中</LoadingText>
          </div>
        </PageBody>
      </Page>
    )
  }

  const showDocDist = data ? hasKbDocDistData(data.kbDocDist) : false

  return (
    <Page>
      <PageBody className="space-y-5">
        <StrategyWorkbenchSection data={data} />
        <DashboardStatCards data={data} />
        <WorkflowSection />

        <div className={`grid gap-4 ${showDocDist ? "lg:grid-cols-[3fr_1fr]" : ""}`}>
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                <LoadingText>加载图表</LoadingText>
              </div>
            }
          >
            <DailyRequestsChart dailyRequests={data?.dailyRequests ?? []} />
            {data ? <KbDocDistChart kbDocDist={data.kbDocDist} /> : null}
          </Suspense>
        </div>

        <TechStackSection />
      </PageBody>
    </Page>
  )
}
