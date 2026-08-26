import { useQuery } from "@tanstack/react-query"
import { getPasswordPolicyConfig } from "@/api/auth"
import { queryKeys } from "@/app/queryKeys"

export function usePasswordPolicyConfig() {
  return useQuery({
    queryKey: queryKeys.auth.passwordPolicy(),
    queryFn: getPasswordPolicyConfig,
    staleTime: Infinity,
  })
}
