import { describe, expect, it } from "vitest"
import type { EvalRun } from "@/api/evals"
import { evalRunAssistantSummary } from "@/features/evals/lib/runDisplay"

function runWithSnapshot(configSnapshot: Record<string, unknown>): EvalRun {
  return {
    id: "run-1",
    datasetId: "dataset-1",
    name: null,
    retrieverMode: "hybrid",
    topK: 6,
    includeGeneration: true,
    executionMode: "agent",
    assistantId: null,
    modelConfigId: "model-config-1",
    kbIds: null,
    status: "succeeded",
    metrics: {},
    resultCount: 2,
    progressCompleted: 2,
    progressTotal: 2,
    errorCount: 0,
    cancelRequested: false,
    heartbeatAt: null,
    configSnapshot,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-08-13T00:00:00Z",
  }
}

describe("evalRunAssistantSummary", () => {
  it("shows the model from model-based eval snapshots", () => {
    expect(
      evalRunAssistantSummary(runWithSnapshot({ model: "gpt-5-mini" }))
    ).toBe("模型 gpt-5-mini")
  })
})
