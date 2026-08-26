import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import {
  buildQueryComparisonSummary,
  comparisonClassificationLabel,
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
vi.mock("@/features/evals/components/EvalBehaviorComparePanel", () => ({
  EvalBehaviorComparePanel: () => null,
}))

describe("comparison presentation", () => {
  it("uses neutral labels for historical comparisons", () => {
    expect(comparisonClassificationLabel("improved")).toBe("B 较高")
    expect(comparisonClassificationLabel("regressed")).toBe("A 较高")
    expect(comparisonClassificationLabel("unchanged")).toBe("基本一致")
    expect(comparisonClassificationLabel("incomparable")).toBe("无法比较")
  })

  it("explains which metric produced the difference", () => {
    expect(buildQueryComparisonSummary(change()).detail).toBe("Recall +0.600")
  })
})

describe("EvalComparePage", () => {
  it("renders a neutral A/B comparison and opens difference-first details", async () => {
    setupHooks()
    renderPage()

    expect(screen.getAllByText("运行 A").length).toBeGreaterThan(0)
    expect(screen.getAllByText("运行 B").length).toBeGreaterThan(0)
    expect(screen.getAllByText("B − A").length).toBeGreaterThan(0)
    expect(screen.queryByText("暂不建议发布")).not.toBeInTheDocument()
    expect(screen.queryByText("基线 Run")).not.toBeInTheDocument()
    expect(screen.queryByText("候选 Run")).not.toBeInTheDocument()

    fireEvent.focus(screen.getByRole("button", { name: "重排成本代理 指标说明" }))
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "它是整次运行的累计值，不是实际金额"
    )

    await userEvent.click(screen.getByRole("button", { name: "查看问题差异" }))

    expect(screen.getByText("问题差异")).toBeInTheDocument()
    expect(screen.getByText("生成答案差异")).toBeInTheDocument()
    expect(screen.getByText("运行 A 的完整答案")).toBeInTheDocument()
    expect(screen.getByText("运行 B 的完整答案")).toBeInTheDocument()
    expect(screen.getByText("召回结果差异")).toBeInTheDocument()
  })

  it("swaps A and B without assigning release semantics", async () => {
    setupHooks()
    renderPage()
    await userEvent.click(
      screen.getByRole("button", { name: "交换运行 A 和运行 B" })
    )
    expect(hookMocks.useEvalRunCompare).toHaveBeenLastCalledWith(
      "cand",
      "base",
      true
    )
  })
})

function setupHooks() {
  hookMocks.useEvalDataset.mockReturnValue({
    data: { id: "dataset-1", name: "测试集" },
  })
  hookMocks.useEvalRuns.mockReturnValue({
    isLoading: false,
    data: { items: [run("base", "第一次运行"), run("cand", "第二次运行")] },
  })
  hookMocks.useEvalRunCompare.mockImplementation(
    (aId: string, bId: string) => ({
      isLoading: false,
      isError: false,
      data: {
        baseline: run(
          aId || "base",
          aId === "cand" ? "第二次运行" : "第一次运行"
        ),
        candidate: run(
          bId || "cand",
          bId === "base" ? "第一次运行" : "第二次运行"
        ),
        metricDeltas: {
          recallAtK: 0.6,
          precisionAtK: 0.6,
          hitAtK: 0.6,
          mrrAtK: 0.6,
          ndcgAtK: 0.6,
          latencyMs: 10,
          providerCostProxy: 0,
        },
        queryChanges: [change()],
      },
    })
  )
  hookMocks.useEvalRunResult.mockImplementation(
    (_runId: string, resultId: string) => ({
      isLoading: false,
      isError: false,
      data: resultId
        ? result(resultId, resultId.startsWith("base") ? 0.2 : 0.8)
        : null,
    })
  )
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/evals/dataset-1/compare?baseline=base&candidate=cand"]}
    >
      <Routes>
        <Route path="/evals/:datasetId/compare" element={<EvalComparePage />} />
        <Route path="/evals/runs/:runId" element={<div>离开对比页</div>} />
      </Routes>
    </MemoryRouter>
  )
}

function change() {
  return {
    queryId: "q-1",
    question: "什么是策略评测？",
    classification: "improved" as const,
    baseline: {
      resultId: "base-result",
      status: "succeeded",
      metrics: metrics(0.2),
    },
    candidate: {
      resultId: "cand-result",
      status: "succeeded",
      metrics: metrics(0.8),
    },
  }
}

function run(id: string, name: string) {
  return {
    id,
    datasetId: "dataset-1",
    name,
    status: "succeeded",
    executionMode: "workflow",
    retrieverMode: "hybrid",
    topK: 5,
    includeGeneration: true,
    configSnapshot: null,
    createdAt: "2026-08-13T00:00:00.000Z",
    progressCompleted: 1,
    progressTotal: 1,
    resultCount: 1,
    errorCount: 0,
    metrics: metrics(id === "base" ? 0.2 : 0.8),
  }
}

function result(id: string, value: number) {
  return {
    id,
    runId: id.startsWith("base") ? "base" : "cand",
    datasetId: "dataset-1",
    queryId: "q-1",
    question: "什么是策略评测？",
    referenceAnswer: "参考答案",
    retrievedChunkIds: ["shared-chunk", `${id}-chunk`],
    relevantChunkIds: ["shared-chunk"],
    metrics: metrics(value),
    generatedAnswer: id.startsWith("base")
      ? "运行 A 的完整答案"
      : "运行 B 的完整答案",
    citations: [],
    error: null,
    agentRunId: null,
    status: "succeeded",
    durationMs: 100,
    createdAt: "2026-08-13T00:00:00.000Z",
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
