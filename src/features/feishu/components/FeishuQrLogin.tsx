import { useEffect, useRef, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createFeishuAuthorize } from "@/api/feishu"
import { loadFeishuQrSdk } from "@/features/feishu/lib/feishuQrSdk"

const QR_CONTAINER_ID = "feishu-qr-container"

type FeishuQrLoginProps = {
  onError?: (message: string) => void
  returnTo?: string
}

export function FeishuQrLogin({ onError, returnTo }: FeishuQrLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })
  const returnToRef = useRef(returnTo)
  useEffect(() => {
    returnToRef.current = returnTo
  })

  useEffect(() => {
    let disposed = false
    let removeListener: (() => void) | null = null

    void (async () => {
      try {
        const { authorizeUrl } = await createFeishuAuthorize(
          returnToRef.current
        )
        setAuthorizeUrl(authorizeUrl)
        if (disposed) return
        const factory = await loadFeishuQrSdk()
        if (disposed || !containerRef.current) return

        containerRef.current.innerHTML = ""
        const handle = factory({
          id: QR_CONTAINER_ID,
          goto: authorizeUrl,
          width: "360",
          height: "360",
        })

        const onMessage = (event: MessageEvent) => {
          if (!handle.matchOrigin(event.origin)) return
          if (!handle.matchData(event.data)) return
          const tmpCode = (event.data as { tmp_code?: string }).tmp_code
          if (tmpCode) {
            window.location.href = `${authorizeUrl}&tmp_code=${encodeURIComponent(
              tmpCode
            )}`
          }
        }
        window.addEventListener("message", onMessage)
        removeListener = () => window.removeEventListener("message", onMessage)
      } catch (error) {
        if (!disposed) {
          const text =
            error instanceof Error ? error.message : "加载飞书二维码失败"
          setLocalError(text)
          onErrorRef.current?.(text)
        }
      } finally {
        if (!disposed) setLoading(false)
      }
    })()

    return () => {
      disposed = true
      removeListener?.()
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-3">
      {loading ? (
        <div className="flex h-72 w-72 items-center justify-center text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      ) : null}
      <div
        id={QR_CONTAINER_ID}
        ref={containerRef}
        className={loading ? "hidden" : "block"}
      />
      {localError ? (
        <div className="flex flex-col items-center gap-3">
          <div className="text-center text-sm text-destructive">{localError}</div>
          {authorizeUrl ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = authorizeUrl
              }}
            >
              Open Feishu authorization page
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="text-sm text-muted-foreground">
        使用飞书 App 扫码，并在手机上确认授权
      </div>
    </div>
  )
}
