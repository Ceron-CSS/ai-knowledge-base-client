import { useNavigate, useRevalidator, useRouteError } from "react-router-dom"

import { resolveRouteError } from "@/app/pages/routeError"
import { RouteStatusPanel } from "@/app/pages/RouteStatusPanel"
import { Button } from "@/components/ui/button"

type RouteErrorPageProps = {
  layout?: "embedded" | "fullscreen"
}

export function RouteErrorPage({ layout = "embedded" }: RouteErrorPageProps) {
  const error = useRouteError()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const { title, message, isChunkError } = resolveRouteError(error)
  const retrying = revalidator.state === "loading"

  const handleRetry = () => {
    if (isChunkError) {
      window.location.reload()
      return
    }

    void revalidator.revalidate()
  }

  return (
    <RouteStatusPanel
      layout={layout}
      title={title}
      description={message}
      actions={
        <>
          <Button variant="dialog-cancel" onClick={() => navigate(-1)}>
            返回上一页
          </Button>
          <Button variant="primary" onClick={handleRetry} loading={retrying}>
            重试
          </Button>
          <Button variant="dialog-cancel" onClick={() => navigate("/home", { replace: true })}>
            回到首页
          </Button>
        </>
      }
    />
  )
}
