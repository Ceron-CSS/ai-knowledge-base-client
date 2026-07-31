import { LoadingText } from "@/components/ui/loading-text"

export function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingText>加载中</LoadingText>
    </div>
  )
}
