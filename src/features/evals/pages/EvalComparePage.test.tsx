import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import {
  buildReleaseConclusion,
  classificationLabel,
} from "@/features/evals/lib/comparePresentation"
import { EvalComparePage } from "@/features/evals/pages/EvalComparePage"

const hookMocks = vi.hoisted(() => ({
  useEvalDataset: vi.fn(),
  useEvalRuns: vi.fn(),
  useEvalRunCompare: vi.fn(),
  useEvalRunResult: vi.fn(),
}))

vi.mock("@/features/evals/hooks/queries", () => hookMocks)

vi.mock("@/features/evals/hooks/useChunkHits", () => ({
  useChunkHits: () => ({ data: [], isFetching: false, hitByChunkId: {} }),
}))

vi.mock("@/features/evals/components/EvalAgentPolicyPanel", () => ({
  EvalAgentPolicyPanel: () => null,
}))

vi.mock("@/features/evals/components/EvalBehaviorComparePanel", () => ({
  EvalBehaviorComparePanel: () => null,
}))

describe("classificationLabel", () => {
  it("maps comparison classifications to user-facing labels", () => {
    expect(classificationLabel("improved")).toBe("改善")
    expect(classificationLabel("regressed")).toBe("回归")
    expect(classificationLabel("unchanged")).toBe("不变")
    expect(classificationLabel("incomparable")).toBe("不可比")
  })
})

describe("buildReleaseConclusion", () => {
  it("blocks policy release when any query regressed", () => {
    expect(buildReleaseConclusion({ improved: 3, regressed: 1, unchanged: 0 })).toEqual({
      tone: "risk",
      title: "暂不建议发布",
      description: "发现 1 个回归问题。先打开回归样本，确认是检索、Planner 还是证据判断导致。",
    })
  })

  it("allows review to proceed when candidate improves without regressions", () => {
    expect(buildReleaseConclusion({ improved: 2, regressed: 0, unchanged: 1 })).toEqual({
      tone: "ready",
      title: "候选策略值得进入发布检查",
      description: "候选运行改善 2 个问题，未发现回归。继续核对延迟、成本和策略门槛。",
    })
  })
})

describe("EvalComparePage", () => {
  it("opens per-question comparison details in the current page", async () => {
    hookMocks.useEvalDataset.mockReturnValue({
      data: { id: "dataset-1", name: "测试集" },
    })
    hookMocks.useEvalRuns.mockReturnValue({
      isLoading: false,
      data: { items: [run("base", "基线 Run"), run("cand", "候选 Run")] },
    })
    hookMocks.useEvalRunCompare.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        baseline: run("base", "基线 Run"),
        candidate: run("cand", "候选 Run"),
        metricDeltas: {
          recallAtK: 0.1,
          precisionAtK: 0,
          hitAtK: 0,
          mrrAtK: 0.1,
          ndcgAtK: 0,
          latencyMs: 10,
          providerCostProxy: 0,
        },
        queryChanges: [
          {
            queryId: "q-1",
            question: "什么是策略评测？",
            classification: "improved",
            baseline: { resultId: "base-result", status: "succeeded", metrics: metrics(0.2) },
            candidate: { resultId: "cand-result", status: "succeeded", metrics: metrics(0.8) },
          },
        ],
      },
    })
    hookMocks.useEvalRunResult.mockImplementation((_runId: string, resultId: string) => ({
      isLoading: false,
      isError: false,
      data: resultId
        ? {
            id: resultId,
            runId: resultId.startsWith("base") ? "base" : "cand",
            datasetId: "dataset-1",
            queryId: "q-1",
            question: "什么是策略评测？",
            referenceAnswer: "参考答案",
            retrievedChunkIds: [`${resultId}-chunk`],
            relevantChunkIds: ["golden-chunk"],
            metrics: metrics(resultId.startsWith("base") ? 0.2 : 0.8),
            generatedAnswer: resultId.startsWith("base") ? "基线完整答案" : "候选完整答案",
            citations: [],
            error: null,
            agentRunId: null,
            status: "succeeded",
            durationMs: 100,
            createdAt: "2026-08-13T00:00:00.000Z",
          }
        : null,
    }))

    render(
      <MemoryRouter initialEntries={["/evals/dataset-1/compare?baseline=base&candidate=cand"]}>
        <Routes>
          <Route path="/evals/:datasetId/compare" element={<EvalComparePage />} />
          <Route path="/evals/runs/:runId" element={<div>离开了对比页</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByRole("button", { name: "打开基线结果" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "打开候选结果" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "查看问题对比详情" }))

    expect(screen.queryByText("离开了对比页")).not.toBeInTheDocument()
    expect(screen.getByText("问题对比详情")).toBeInTheDocument()
    expect(screen.getByText("基线完整答案")).toBeInTheDocument()
    expect(screen.getByText("候选完整答案")).toBeInTheDocument()
  })
})

function run(id: string, name: string) {
  return {
    id,
    datasetId: "dataset-1",
    name,
    status: "succeeded",
    executionMode: "manual",
    retrieverMode: "hybrid",
    topK: 5,
    includeGeneration: true,
    configSnapshot: null,
    createdAt: "2026-08-13T00:00:00.000Z",
    progressCompleted: 1,
    progressTotal: 1,
    resultCount: 1,
    errorCount: 0,
    metrics: metrics(0.5),
  }
}

function metrics(value: number) {
  return {
    recallAtK: value,
    precisionAtK: value,
    hitAtK: value,
    mrrAtK: value,
    ndcgAtK: value,
    latencyMs: 100,
    providerCostProxy: 0,
  }
}
