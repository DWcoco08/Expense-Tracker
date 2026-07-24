import { api } from '@/lib/api'

export interface PublicUser {
  id: string
  email: string
  name: string
  timezone: string
  baseCurrency: string
  createdAt: number
  updatedAt: number
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export function registerAccount(input: RegisterInput) {
  return api.post<{ user: PublicUser }>('/auth/register', input)
}

export function login(input: LoginInput) {
  return api.post<{ user: PublicUser }>('/auth/login', input)
}

export function logout() {
  return api.post<undefined>('/auth/logout')
}

export function getCurrentUser() {
  return api.get<PublicUser>('/me')
}
