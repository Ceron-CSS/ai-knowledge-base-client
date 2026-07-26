export const BASE_MODEL_OPTIONS_BY_PROVIDER: Record<string, Array<{ label: string; value: string }>> = {
  "aliyun-bailian": [
    { label: "qwen-plus", value: "qwen-plus" },
    { label: "qwen-turbo", value: "qwen-turbo" },
    { label: "qwen-max", value: "qwen-max" },
    { label: "qwen-long", value: "qwen-long" },
    { label: "qwen-flash", value: "qwen-flash" },
    { label: "qwen-plus-latest", value: "qwen-plus-latest" },
    { label: "qwen-turbo-latest", value: "qwen-turbo-latest" },
    { label: "qwen-max-latest", value: "qwen-max-latest" },
    { label: "qwen3-plus", value: "qwen3-plus" },
    { label: "qwen3-max", value: "qwen3-max" },
    { label: "qwen3-coder-plus", value: "qwen3-coder-plus" },
    { label: "qwen3-coder-flash", value: "qwen3-coder-flash" },
    { label: "qwen-vl-plus（支持图片）", value: "qwen-vl-plus" },
    { label: "qwen-vl-max（支持图片）", value: "qwen-vl-max" },
  ],
  deepseek: [
    { label: "deepseek-v4-pro", value: "deepseek-v4-pro" },
    { label: "deepseek-v4-flash", value: "deepseek-v4-flash" },
  ],
  openai: [
    { label: "gpt-5.5", value: "gpt-5.5" },
    { label: "gpt-5.4", value: "gpt-5.4" },
    { label: "gpt-5.4-mini", value: "gpt-5.4-mini" },
    { label: "gpt-5.4-nano", value: "gpt-5.4-nano" },
    { label: "gpt-5.2", value: "gpt-5.2" },
    { label: "gpt-5.1", value: "gpt-5.1" },
    { label: "gpt-5", value: "gpt-5" },
    { label: "gpt-5-mini", value: "gpt-5-mini" },
    { label: "gpt-5-nano", value: "gpt-5-nano" },
  ],
}

export const DEFAULT_BASE_MODEL = BASE_MODEL_OPTIONS_BY_PROVIDER["aliyun-bailian"][0].value

export function getBaseModelOptionsForProvider(provider: string) {
  return BASE_MODEL_OPTIONS_BY_PROVIDER[provider] ?? BASE_MODEL_OPTIONS_BY_PROVIDER["aliyun-bailian"]
}
