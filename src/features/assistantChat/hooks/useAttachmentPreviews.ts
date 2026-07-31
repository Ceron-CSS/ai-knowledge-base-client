import { useEffect, useMemo, useState } from "react"

export function useAttachmentPreviews() {
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const pendingFilePreviews = useMemo(
    () =>
      pendingFiles.map((file) => ({
        key: `${file.name}-${file.lastModified}`,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    [pendingFiles],
  )

  useEffect(() => {
    return () => {
      for (const item of pendingFilePreviews) {
        if (item.url) URL.revokeObjectURL(item.url)
      }
    }
  }, [pendingFilePreviews])

  return {
    pendingFiles,
    setPendingFiles,
    pendingFilePreviews,
  }
}
