import { LoaderCircle } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { KB_UPLOAD_ACCEPT, KB_UPLOAD_DESCRIPTION } from "@/features/kb/constants/upload"

type KbFileUploadDialogProps = {
  open: boolean
  uploading: boolean
  uploadError: string | null
  dragOver: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onOpenChange: (open: boolean) => void
  onPickFile: (file: File | null) => void
  onDragOver: (event: React.DragEvent) => void
  onDragLeave: () => void
}

export function KbFileUploadDialog({
  open,
  uploading,
  uploadError,
  dragOver,
  fileInputRef,
  onOpenChange,
  onPickFile,
  onDragOver,
  onDragLeave,
}: KbFileUploadDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!uploading) onOpenChange(nextOpen)
      }}
      title="上传文件"
      description={KB_UPLOAD_DESCRIPTION}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={KB_UPLOAD_ACCEPT}
        onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
      />
      <div className="relative">
        <button
          type="button"
          className={[
            "w-full rounded-lg border-2 border-dashed px-4 py-10 text-center transition",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:bg-muted/40",
          ].join(" ")}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={(e) => {
            e.preventDefault()
            onDragLeave()
            if (!uploading) void onPickFile(e.dataTransfer.files?.[0] ?? null)
          }}
          disabled={uploading}
        >
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{uploading ? "正在解析文件" : "拖拽文件至此上传"}</div>
            <div className="text-sm">
              或 <span className="text-primary underline">选择文件</span>
            </div>
          </div>
        </button>
        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border bg-background/85 text-sm text-muted-foreground backdrop-blur-sm">
            <LoaderCircle className="mb-3 h-7 w-7 animate-spin text-primary" />
            <span>正在上传并解析文件</span>
          </div>
        ) : null}
      </div>
      {uploadError ? <div className="mt-3 text-sm text-destructive">{uploadError}</div> : null}
    </Dialog>
  )
}
