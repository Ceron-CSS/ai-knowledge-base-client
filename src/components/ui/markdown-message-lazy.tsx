import { Suspense, lazy } from "react"
import { LoadingText } from "./loading-text"

const MarkdownMessage = lazy(() =>
  import("./markdown-message").then((module) => ({ default: module.MarkdownMessage })),
)

type MarkdownMessageLazyProps = {
  content: string
  citationCount?: number
  onCitationClick?: (index: number, event: React.MouseEvent<HTMLButtonElement>) => void
}

export function MarkdownMessageLazy({ content, citationCount = 0, onCitationClick }: MarkdownMessageLazyProps) {
  return (
    <Suspense fallback={<LoadingText className="inline-flex">加载中</LoadingText>}>
      <MarkdownMessage content={content} citationCount={citationCount} onCitationClick={onCitationClick} />
    </Suspense>
  )
}
