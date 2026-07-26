import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { techStackItemIcon, techStacks } from "@/features/home/constants/techStacks"

export function TechStackSection() {
  const ItemIcon = techStackItemIcon

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {techStacks.map(({ title, description, Icon, items }) => (
        <Card key={title}>
          <CardHeader className="gap-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm">{title}</CardTitle>
                <CardDescription className="mt-1 text-xs leading-relaxed">{description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => (
                <div key={item} className="flex min-h-10 items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <ItemIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
