import { useNavigate } from "react-router-dom"

import { RouteStatusPanel } from "@/app/pages/RouteStatusPanel"
import { Button } from "@/components/ui/button"

type NotFoundPageProps = {
  layout?: "embedded" | "fullscreen"
}

export function NotFoundPage({ layout = "embedded" }: NotFoundPageProps) {
  const navigate = useNavigate()

  return (
    <RouteStatusPanel
      layout={layout}
      code="404"
      title="页面不存在"
      description="你访问的链接可能已失效，或地址输入有误。"
      actions={
        <>
          <Button variant="dialog-cancel" onClick={() => navigate(-1)}>
            返回上一页
          </Button>
          <Button variant="primary" onClick={() => navigate("/home", { replace: true })}>
            回到首页
          </Button>
        </>
      }
    />
  )
}
