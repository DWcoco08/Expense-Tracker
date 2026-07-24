import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from './api'

const CURRENT_USER_KEY = ['me']

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: authApi.getCurrentUser,
    retry: false,
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.registerAccount,
    onSuccess: (data) => {
      queryClient.setQueryData(CURRENT_USER_KEY, data.user)
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(CURRENT_USER_KEY, data.user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
