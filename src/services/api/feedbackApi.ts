import { apiPost } from './apiClient'

export interface FeedbackPayload {
  type: 'bug' | 'navrh' | 'jine'
  message: string
  email?: string
  page?: string
  userAgent?: string
}

export function sendFeedback(payload: FeedbackPayload) {
  return apiPost<{ ok: boolean }>('/feedback/', payload)
}
