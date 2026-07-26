import { Breadcrumb } from "@/components/ui/breadcrumb"
import { LoadingText } from "@/components/ui/loading-text"
import { DailyRequestsChart } from "@/features/home/components/DailyRequestsChart"
import { DashboardStatCards } from "@/features/home/components/DashboardStatCards"
import { hasKbDocDistData, KbDocDistChart } from "@/features/home/components/KbDocDistChart"
import { TechStackSection } from "@/features/home/components/TechStackSection"
import { WorkflowSection } from "@/features/home/components/WorkflowSection"
import { useDashboardStats } from "@/features/home/hooks/queries"

export function HomePage() {
  const stats = useDashboardStats()
  const data = stats.data

  if (stats.isLoading) {
    return (
      <div className="space-y-2">
        <Breadcrumb items={[{ label: "主页" }]} />
        <div className="flex rounded-lg border bg-background px-4 py-10">
          <LoadingText className="mx-auto">加载中</LoadingText>
        </div>
      </div>
    )
  }

  const showDocDist = data ? hasKbDocDistData(data.kbDocDist) : false

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "主页" }]} />

      <DashboardStatCards data={data} />

      <div className={`grid gap-4 ${showDocDist ? "lg:grid-cols-[3fr_1fr]" : ""}`}>
        <DailyRequestsChart dailyRequests={data?.dailyRequests ?? []} />
        {data ? <KbDocDistChart kbDocDist={data.kbDocDist} /> : null}
      </div>

      <TechStackSection />
      <WorkflowSection />
    </div>
  )
}
