const TOKEN_KEY = 'fh_tracker_auth_token'

function getBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? '/api'
}

export type ApiResult<T> = { data: T | null; error: string | null }

let token: string | null = localStorage.getItem(TOKEN_KEY)

export function getToken(): string | null { return token }
export function setToken(t: string) { token = t; localStorage.setItem(TOKEN_KEY, t) }
export function clearToken() { token = null; localStorage.removeItem(TOKEN_KEY) }
export function hasToken(): boolean { return !!token }

async function request<T>(method: string, path: string, body?: unknown, isForm?: boolean): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    let reqBody: string | FormData | undefined
    if (body) {
      if (isForm) {
        const form = new URLSearchParams()
        for (const [k, v] of Object.entries(body as Record<string, string>)) {
          form.append(k, v)
        }
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        reqBody = form.toString()
      } else {
        headers['Content-Type'] = 'application/json'
        reqBody = JSON.stringify(body)
      }
    }

    const res = await fetch(`${getBaseUrl()}${path}`, { method, headers, body: reqBody })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      return { data: null, error: err.detail ?? `Chyba ${res.status}` }
    }

    if (res.status === 204) return { data: null, error: null }
    const data = await res.json() as T
    return { data, error: null }
  } catch (e) {
    return { data: null, error: 'Nepodařilo se připojit k serveru' }
  }
}

export function apiGet<T>(path: string) { return request<T>('GET', path) }
export function apiPost<T>(path: string, body?: unknown) { return request<T>('POST', path, body) }
export function apiDelete(path: string) { return request<void>('DELETE', path) }
export function apiPostForm<T>(path: string, body: Record<string, string>) { return request<T>('POST', path, body, true) }
