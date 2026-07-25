import { useQuery } from "@tanstack/react-query"
import { getPasswordPolicyConfig } from "@/api/auth"

export function usePasswordPolicyConfig() {
  return useQuery({
    queryKey: ["auth", "password-policy"],
    queryFn: getPasswordPolicyConfig,
    staleTime: Infinity,
  })
}
