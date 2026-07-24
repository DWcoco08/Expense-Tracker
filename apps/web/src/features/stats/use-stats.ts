import { useQuery } from '@tanstack/react-query'
import * as statsApi from './api'

export function useDashboard(month?: string) {
  return useQuery({
    queryKey: ['stats', 'dashboard', month],
    queryFn: () => statsApi.getDashboard(month),
  })
}

export function useOverview(from: string, to: string) {
  return useQuery({
    queryKey: ['stats', 'overview', from, to],
    queryFn: () => statsApi.getOverview(from, to),
  })
}
