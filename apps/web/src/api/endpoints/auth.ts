import { api } from '@/api/client'

export interface AuthUser {
  user: {
    id: string
    organizationId: string
    email: string
    name: string
    role: 'admin' | 'member' | 'master'
    avatarUrl: string | null
    timezone: string
    isActive: boolean
    lastLoginAt: string | null
    createdAt: string
    updatedAt: string
  }
  organization: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    timezone: string
    plan: 'free' | 'starter' | 'pro' | 'enterprise'
    createdAt: string
    updatedAt: string
  }
}

export interface RegisterInput {
  orgName: string
  orgSlug: string
  email: string
  password: string
  name: string
}

export interface LoginInput {
  email: string
  password: string
}

export function register(input: RegisterInput): Promise<AuthUser> {
  return api<AuthUser>('/api/v1/auth/register', { method: 'POST', body: input })
}

export function login(input: LoginInput): Promise<AuthUser> {
  return api<AuthUser>('/api/v1/auth/login', { method: 'POST', body: input })
}

export function refresh(): Promise<void> {
  return api<void>('/api/v1/auth/refresh', { method: 'POST' })
}

export function logout(): Promise<void> {
  return api<void>('/api/v1/auth/logout', { method: 'POST' })
}

export function getMe(): Promise<AuthUser> {
  return api<AuthUser>('/api/v1/auth/me')
}
