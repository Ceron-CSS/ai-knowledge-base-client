import type { ComponentProps, Key, ReactNode } from "react"
import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

export type DataTableColumn<T> = {
  key: Key
  header: ReactNode
  className?: string
  cellClassName?: string
  render: (item: T) => ReactNode
}

type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>
  data: T[]
  getRowKey: (item: T) => Key
  loading?: boolean
  error?: boolean
  errorText?: ReactNode
  emptyText?: ReactNode
  tableClassName?: string
  containerClassName?: string
}

function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  error = false,
  errorText = "加载失败，请稍后重试",
  emptyText = "暂无数据",
  tableClassName,
  containerClassName,
}: DataTableProps<T>) {
  if (loading) return <DataTableEmpty loading>加载中</DataTableEmpty>
  if (error) return <DataTableEmpty className="text-destructive">{errorText}</DataTableEmpty>
  if (!data.length) return <DataTableEmpty>{emptyText}</DataTableEmpty>

  return (
    <DataTableContainer className={containerClassName}>
      <table className={cn("w-full table-fixed text-left text-sm", tableClassName)}>
        <thead className="bg-muted/40">
          <tr className="border-b">
            {columns.map((column) => (
              <th key={column.key} className={cn("px-3 py-2 align-middle font-medium", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={getRowKey(item)} className="border-b last:border-b-0">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-3 py-2 align-middle", column.cellClassName)}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableContainer>
  )
}

function DataTableContainer({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("overflow-x-auto rounded-lg border bg-background", className)} {...props} />
}

type DataTableEmptyProps = ComponentProps<"div"> & {
  loading?: boolean
}

function DataTableEmpty({ className, children, loading = false, ...props }: DataTableEmptyProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground",
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      <span>{children}</span>
    </div>
  )
}

export { DataTable, DataTableEmpty }
