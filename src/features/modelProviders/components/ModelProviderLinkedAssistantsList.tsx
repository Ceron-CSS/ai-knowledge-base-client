import type { ModelConfigLinkedAssistant } from "@/api/models"

type ModelProviderLinkedAssistantsListProps = {
  assistants: ModelConfigLinkedAssistant[]
}

export function ModelProviderLinkedAssistantsList({ assistants }: ModelProviderLinkedAssistantsListProps) {
  return (
    <ul className="max-h-36 overflow-auto rounded-md border bg-muted/30 p-2 text-sm">
      {assistants.map((assistant) => (
        <li key={assistant.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
          <span className="truncate">{assistant.name}</span>
          {assistant.published ? (
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">已发布</span>
          ) : (
            <span className="shrink-0 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-700">未发布</span>
          )}
        </li>
      ))}
    </ul>
  )
}
