import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type MarkdownMessageProps = {
  content: string
  citationCount?: number
  onCitationClick?: (index: number, event: React.MouseEvent<HTMLButtonElement>) => void
}

function linkCitationMarkers(content: string, citationCount: number) {
  if (citationCount <= 0) return content
  return content.replace(/\[(\d+)\](?!\()/g, (full, raw: string) => {
    const index = Number(raw)
    if (!Number.isInteger(index) || index < 1 || index > citationCount) return full
    return `[[${index}]](#citation-${index})`
  })
}

export function MarkdownMessage({ content, citationCount = 0, onCitationClick }: MarkdownMessageProps) {
  const renderedContent = linkCitationMarkers(content, citationCount)

  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children, ...props }) => {
            if (href?.startsWith("#citation-")) {
              const index = Number(href.slice("#citation-".length))
              return (
                <button
                  type="button"
                  className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-muted-foreground/40 bg-muted/60 px-1.5 text-[11px] font-medium leading-none text-muted-foreground no-underline hover:border-muted-foreground/70 hover:bg-muted"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onCitationClick?.(index - 1, event)
                  }}
                >
                  {children}
                </button>
              )
            }
            return <a {...props} href={href} target="_blank" rel="noreferrer noopener">{children}</a>
          },
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  )
}
