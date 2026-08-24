import { Fragment, type ComponentProps, type Key, type ReactNode } from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DataTableColumn<T> = {
  key: Key
  header: ReactNode
  className?: string
  cellClassName?: string
  render: (item: T) => ReactNode
}

export type DataTablePagination = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  showWhenSinglePage?: boolean
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
  pagination?: DataTablePagination
  isRowExpanded?: (item: T) => boolean
  renderExpanded?: (item: T) => ReactNode
}

function shouldShowPagination(pagination: DataTablePagination | undefined) {
  if (!pagination) return false
  if (pagination.showWhenSinglePage) return true
  return pagination.total > pagination.pageSize || pagination.page > 1
}

function DataTablePaginationBar({ pagination }: { pagination: DataTablePagination }) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))

  return (
    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <span>
        第 {pagination.page}/{totalPages} 页 · 共 {pagination.total} 条
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={pagination.page <= 1}
        onClick={() => pagination.onPageChange(pagination.page - 1)}
      >
        上一页
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pagination.page >= totalPages}
        onClick={() => pagination.onPageChange(pagination.page + 1)}
      >
        下一页
      </Button>
    </div>
  )
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
  pagination,
  isRowExpanded,
  renderExpanded,
}: DataTableProps<T>) {
  if (loading) return <DataTableEmpty loading>加载中</DataTableEmpty>
  if (error) return <DataTableEmpty className="text-destructive">{errorText}</DataTableEmpty>

  if (!data.length) {
    return (
      <div className="space-y-2">
        <DataTableEmpty>{emptyText}</DataTableEmpty>
        {shouldShowPagination(pagination) ? <DataTablePaginationBar pagination={pagination!} /> : null}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <DataTableContainer className={containerClassName}>
        <table className={cn("w-full table-fixed text-left text-sm", tableClassName)}>
          <thead>
            <tr className="border-b border-border bg-[#F1F5F9]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 align-middle text-sm font-semibold text-[#17243D]",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-normal">
            {data.map((item) => {
              const rowKey = getRowKey(item)
              const expanded = Boolean(isRowExpanded?.(item))
              return (
                <Fragment key={rowKey}>
                  <tr className="border-b font-normal transition-colors last:border-b-0 hover:bg-muted/40">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn("px-4 py-2.5 align-middle", column.cellClassName, "font-normal")}
                      >
                        {column.render(item)}
                      </td>
                    ))}
                  </tr>
                  {expanded && renderExpanded ? (
                    <tr className="border-b bg-muted/10">
                      <td colSpan={columns.length} className="px-4 py-3">
                        {renderExpanded(item)}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </DataTableContainer>

      {shouldShowPagination(pagination) ? <DataTablePaginationBar pagination={pagination!} /> : null}
    </div>
  )
}

function DataTableContainer({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("overflow-x-auto rounded-lg border border-border bg-card shadow-sm", className)} {...props} />
}

type DataTableEmptyProps = ComponentProps<"div"> & {
  loading?: boolean
}

function DataTableEmpty({ className, children, loading = false, ...props }: DataTableEmptyProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm",
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
