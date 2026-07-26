type AssistantFormValues = {
  name: string
  modelConfigId: string
  baseModel: string
}

export function validateAssistantForm(values: AssistantFormValues): string | null {
  if (!values.name.trim()) return "请输入助手名称"
  if (!values.modelConfigId) return "请选择模型配置"
  if (!values.baseModel) return "请选择基础模型"
  return null
}
