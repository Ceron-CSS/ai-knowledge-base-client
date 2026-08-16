const SDK_URL =
  "https://lf-package-cn.feishucdn.com/obj/feishu-static/lark/passport/qrcode/LarkSSOSDKWebQRCode-1.0.3.js"

const SCRIPT_ATTR = "data-feishu-qr"

export type QrLoginHandle = {
  matchOrigin: (origin: string) => boolean
  matchData: (data: unknown) => boolean
}

export type QrLoginFactory = (options: {
  id: string
  goto: string
  width?: string
  height?: string
  style?: string
}) => QrLoginHandle

type QrLoginWindow = Window & { QRLogin?: QrLoginFactory }

let cachedFactory: Promise<QrLoginFactory> | null = null

/**
 * Loads the Feishu web QR-code login SDK once and caches the factory.
 * The SDK exposes window.QRLogin; errors reset the cache so a retry can work.
 */
export function loadFeishuQrSdk(): Promise<QrLoginFactory> {
  if (cachedFactory) return cachedFactory

  cachedFactory = new Promise<QrLoginFactory>((resolve, reject) => {
    const existing = document.querySelector(`script[${SCRIPT_ATTR}]`)
    if (existing && (window as QrLoginWindow).QRLogin) {
      resolve((window as QrLoginWindow).QRLogin as QrLoginFactory)
      return
    }

    const script = document.createElement("script")
    script.src = SDK_URL
    script.dataset.feishuQr = "true"
    script.async = true
    script.onload = () => {
      const factory = (window as QrLoginWindow).QRLogin
      if (factory) {
        resolve(factory)
      } else {
        cachedFactory = null
        reject(new Error("飞书二维码 SDK 加载失败"))
      }
    }
    script.onerror = () => {
      cachedFactory = null
      reject(new Error("飞书二维码 SDK 加载失败"))
    }
    document.head.appendChild(script)
  })

  return cachedFactory
}
