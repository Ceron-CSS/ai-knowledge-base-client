import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ONBOARDING_STEPS } from "../constants/steps"
import type { Rect } from "../types"
import { getCardPosition, readTargetRect } from "../utils/position"

type UseOnboardingTourOptions = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function useOnboardingTour({ open, onOpenChange, onComplete }: UseOnboardingTourOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const [index, setIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)

  const step = ONBOARDING_STEPS[index]
  const isFirst = index === 0
  const isLast = index === ONBOARDING_STEPS.length - 1
  const progress = useMemo(
    () => Math.round(((index + 1) / ONBOARDING_STEPS.length) * 100),
    [index],
  )
  const cardPosition = useMemo(() => getCardPosition(targetRect), [targetRect])

  const closeAndComplete = useCallback(() => {
    onComplete()
    onOpenChange(false)
    setIndex(0)
  }, [onComplete, onOpenChange])

  const goPrevious = useCallback(() => {
    setIndex((v) => Math.max(0, v - 1))
  }, [])

  const goNext = useCallback(() => {
    if (isLast) {
      closeAndComplete()
      return
    }
    setIndex((v) => Math.min(ONBOARDING_STEPS.length - 1, v + 1))
  }, [closeAndComplete, isLast])

  const refreshTargetRect = useCallback(() => {
    if (!open) return
    window.requestAnimationFrame(() => {
      setTargetRect(readTargetRect(step.target))
    })
  }, [open, step.target])

  useEffect(() => {
    if (!open) return
    if (location.pathname !== step.route) {
      navigate(step.route)
    }
  }, [location.pathname, navigate, open, step.route])

  useEffect(() => {
    refreshTargetRect()
  }, [location.pathname, refreshTargetRect])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAndComplete()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrevious()
    }
    function onViewportChange() {
      refreshTargetRect()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("resize", onViewportChange)
    window.addEventListener("scroll", onViewportChange, true)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", onViewportChange)
      window.removeEventListener("scroll", onViewportChange, true)
    }
  }, [closeAndComplete, goNext, goPrevious, open, refreshTargetRect])

  return {
    index,
    stepCount: ONBOARDING_STEPS.length,
    step,
    isFirst,
    isLast,
    progress,
    targetRect,
    cardPosition,
    closeAndComplete,
    goPrevious,
    goNext,
  }
}
