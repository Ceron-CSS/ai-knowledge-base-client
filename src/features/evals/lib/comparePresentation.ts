export function classificationLabel(value: string) {
  if (value === "improved") return "改善"
  if (value === "regressed") return "回归"
  if (value === "unchanged") return "不变"
  if (value === "incomparable") return "不可比"
  return value
}

export function buildReleaseConclusion({
  improved,
  regressed,
  unchanged,
}: {
  improved: number
  regressed: number
  unchanged: number
}) {
  if (regressed > 0) {
    return {
      tone: "risk" as const,
      title: "暂不建议发布",
      description: `发现 ${regressed} 个回归问题。先打开回归样本，确认是检索、Planner 还是证据判断导致。`,
    }
  }
  if (improved > 0) {
    return {
      tone: "ready" as const,
      title: "候选策略值得进入发布检查",
      description: `候选运行改善 ${improved} 个问题，未发现回归。继续核对延迟、成本和 Policy 门槛。`,
    }
  }
  return {
    tone: "neutral" as const,
    title: "候选策略未体现明确收益",
    description: `当前 ${unchanged} 个问题没有质量变化。除非延迟或成本明显下降，否则不建议发布。`,
  }
}
