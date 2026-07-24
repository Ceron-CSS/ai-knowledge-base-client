import { createPortal } from "react-dom"
import { useOnboardingTour } from "../hooks/useOnboardingTour"
import { OnboardingCard } from "./OnboardingCard"
import { OnboardingSpotlight } from "./OnboardingSpotlight"

type OnboardingGuideProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function OnboardingGuide({ open, onOpenChange, onComplete }: OnboardingGuideProps) {
  const tour = useOnboardingTour({ open, onOpenChange, onComplete })

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/45" />

      {tour.targetRect ? <OnboardingSpotlight rect={tour.targetRect} /> : null}

      <OnboardingCard
        step={tour.step}
        index={tour.index}
        stepCount={tour.stepCount}
        progress={tour.progress}
        isFirst={tour.isFirst}
        isLast={tour.isLast}
        position={tour.cardPosition}
        onSkip={tour.closeAndComplete}
        onPrevious={tour.goPrevious}
        onNext={tour.goNext}
      />
    </div>,
    document.body,
  )
}
