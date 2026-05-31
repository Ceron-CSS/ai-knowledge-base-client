import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items.length) return null

  return (
    <nav className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? (
              <ChevronRight className={cn("shrink-0", isLast ? "h-4 w-4" : "h-3.5 w-3.5")} />
            ) : null}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="rounded-sm hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast && "text-lg font-semibold text-foreground")}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
