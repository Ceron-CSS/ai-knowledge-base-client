import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { BreadcrumbItem } from "./breadcrumb"

type PageHeaderProps = {
  items: BreadcrumbItem[]
  description?: ReactNode
  actions?: ReactNode
  className?: string
  children?: ReactNode
}

/** Full-bleed white top bar for the main content pane (title left, optional actions right). */
export function PageHeader({ items, description, actions, className, children }: PageHeaderProps) {
  if (!items.length) return null

  return (
    <header className={cn("sticky top-0 z-40 shrink-0 border-b border-border bg-card", className)}>
      <div className="flex items-start justify-between gap-4 px-6 py-3">
        <div className="min-w-0 flex-1">
          <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            {items.map((item, i) => {
              const isLast = i === items.length - 1
              return (
                <span key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
                  {i > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : null}
                  {item.href && !isLast ? (
                    <Link to={item.href} className="shrink-0 rounded-sm hover:text-foreground">
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        "min-w-0 truncate",
                        isLast && "text-lg font-semibold text-[#17243D]",
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </span>
              )
            })}
          </nav>
          {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
          {children}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

type PageBodyProps = {
  children: ReactNode
  className?: string
}

/** Padded content area below PageHeader. */
export function PageBody({ children, className }: PageBodyProps) {
  return <div className={cn("flex-1 px-6 py-3", className)}>{children}</div>
}

type PageProps = {
  children: ReactNode
  className?: string
  /** Fill the main pane height (chat / detail). Default grows with content. */
  fill?: boolean
}

/** Page shell: white header + gray body on the right pane. */
export function Page({ children, className, fill = false }: PageProps) {
  return (
    <div className={cn("flex flex-col", fill ? "h-full min-h-0 overflow-hidden" : "min-h-full", className)}>
      {children}
    </div>
  )
}
