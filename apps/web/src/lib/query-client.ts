import { QueryClient } from '@tanstack/react-query'

// Cấu hình fetch tập trung một chỗ (standards.md mục 4, tương ứng lib/api.ts)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
