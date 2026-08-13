import type { EvalRun } from "@/api/evals"

const LEGACY_SEED_RUN_NAMES = new Set(["baseline-vector-top3", "candidate-hybrid-rerank-top6"])

export function isFixedSeedUiDemoRun(run: Pick<EvalRun, "name" | "configSnapshot">) {
  if (run.configSnapshot?.artifactType === "fixed_seed_ui_demo") return true
  return run.name ? LEGACY_SEED_RUN_NAMES.has(run.name) : false
}

export function FixedSeedUiDemoBadge() {
  return (
    <span className="inline-flex w-fit items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100">
      Fixed seed UI Demo
    </span>
  )
}
