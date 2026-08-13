import { describe, expect, it } from "vitest"
import {
  buildReleaseConclusion,
  classificationLabel,
} from "@/features/evals/lib/comparePresentation"

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
      description: "候选运行改善 2 个问题，未发现回归。继续核对延迟、成本和 Policy 门槛。",
    })
  })
})
