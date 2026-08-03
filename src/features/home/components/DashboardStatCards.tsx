import { BookOpen, Bot, Cpu, FileText } from "lucide-react"
import type { DashboardStats } from "@/api/stats"
import { StatCard } from "@/features/home/components/StatCard"

type DashboardStatCardsProps = {
  data?: DashboardStats
}

export function DashboardStatCards({ data }: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<BookOpen className="h-5 w-5" />}
        label="知识库"
        value={data ? `${data.kbCount.enabled}/${data.kbCount.total}` : "-"}
        href="/kb"
      />
      <StatCard
        icon={<FileText className="h-5 w-5" />}
        label="文档条目"
        value={data ? String(data.itemCount) : "-"}
        href="/kb"
      />
      <StatCard
        icon={<Bot className="h-5 w-5" />}
        label="问答助手"
        value={data ? `${data.assistantCount.published}/${data.assistantCount.total}` : "-"}
        href="/assistants"
      />
      <StatCard
        icon={<Cpu className="h-5 w-5" />}
        label="模型提供商"
        value={data ? String(data.modelConfigCount) : "-"}
        href="/model-providers"
      />
    </div>
  )
}
