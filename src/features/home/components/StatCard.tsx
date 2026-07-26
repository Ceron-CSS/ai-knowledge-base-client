import { Link } from "react-router-dom"

type StatCardProps = {
  icon: React.ReactNode
  label: string
  value: string
  href: string
}

export function StatCard({ icon, label, value, href }: StatCardProps) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition hover:bg-muted/30"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </Link>
  )
}
