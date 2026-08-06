import { Check, ChevronDown } from "lucide-react"
import { Select as BaseSelect } from "@base-ui/react/select"
import { cn } from "@/lib/utils"

export type SelectOption = {
  label: string
  value: string
  disabled?: boolean
}

type SelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  modal?: boolean
  className?: string
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "请选择",
  disabled = false,
  modal = true,
  className,
}: SelectProps) {
  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(next) => onValueChange(String(next ?? ""))}
      disabled={disabled}
      modal={modal}
      items={options.map((option) => ({ value: option.value, label: option.label }))}
    >
      <BaseSelect.Trigger
        className={cn(
          "group flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 text-sm outline-none transition",
          "focus-visible:ring-2 focus-visible:ring-primary/20 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          className,
        )}
      >
        <BaseSelect.Value placeholder={placeholder} />
        <BaseSelect.Icon>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={6} align="start" alignItemWithTrigger={false} className="z-[70]">
          <BaseSelect.Popup className="z-50 min-w-[var(--anchor-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
            <BaseSelect.List className="max-h-64 overflow-auto p-1">
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex cursor-pointer items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none select-none",
                    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  )}
                >
                  <BaseSelect.ItemIndicator className="absolute left-2 inline-flex h-4 w-4 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}
