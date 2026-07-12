import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/constants"
import { UserService } from "@/services/user.service"

export function useTeamMembers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.TEAM_MEMBERS,
    queryFn: () => UserService.getTeamMembers(),
    enabled: options?.enabled ?? true,
  })
}

export function useSubAccounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.SUB_ACCOUNTS,
    queryFn: () => UserService.getSubAccounts(),
    enabled: options?.enabled ?? true,
  })
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; email: string; skills: string[] }) =>
      UserService.createTeamMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM_MEMBERS })
    },
  })
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name?: string; skills?: string[]; isAvailable?: boolean }
    }) => UserService.updateTeamMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM_MEMBERS })
    },
  })
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => UserService.deleteTeamMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM_MEMBERS })
    },
  })
}

export function useToggleAvailability() {
  const _queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => UserService.toggleAvailability(),
  })
}

export function useMyStats() {
  return useQuery({
    queryKey: [...QUERY_KEYS.TEAM_MEMBERS, "stats", "me"],
    queryFn: () => UserService.getMyStats(),
  })
}
