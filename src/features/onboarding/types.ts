import type { LucideIcon } from "lucide-react"

export type OnboardingStep = {
  title: string
  subtitle: string
  Icon: LucideIcon
  points: string[]
  action: string
  route: string
  target: string
}

export type Rect = {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

export type CardPosition = {
  top: number
  left: number
  width: number
  arrow: "left" | "top"
  arrowOffset: number
}
