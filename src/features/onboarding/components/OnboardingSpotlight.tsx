import type { Rect } from "../types"

type OnboardingSpotlightProps = {
  rect: Rect
}

export function OnboardingSpotlight({ rect }: OnboardingSpotlightProps) {
  return (
    <div
      className="pointer-events-none fixed z-[51] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      }}
    />
  )
}
