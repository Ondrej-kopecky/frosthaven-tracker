import { apiPost, apiPostForm, apiGet, apiDeleteBody } from './apiClient'

export interface AuthUser {
  id: number
  email: string
  username: string
  is_verified: boolean
}

export function register(email: string, username: string, password: string) {
  return apiPost<{ message: string }>('/auth/register', { email, username, password })
}

export function verify(email: string, code: string) {
  return apiPost<{ message: string }>('/auth/verify', { email, code })
}

export function resendCode(email: string) {
  return apiPost<{ message: string }>('/auth/resend-code', { email })
}

export function login(email: string, password: string) {
  return apiPostForm<{ access_token: string; token_type: string }>('/auth/login', { username: email, password })
}

export function forgotPassword(email: string) {
  return apiPost<{ message: string }>('/auth/forgot-password', { email })
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return apiPost<{ message: string }>('/auth/reset-password', { email, code, new_password: newPassword })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiPost<{ message: string }>('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}

export function getMe() {
  return apiGet<AuthUser>('/auth/me')
}

/** GDPR: trvalé smazání účtu včetně kampaní v cloudu. */
export function deleteAccount(password: string) {
  return apiDeleteBody<{ message: string }>('/auth/account', { password })
}
