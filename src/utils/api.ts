import type { ApiResp } from '../../shared/types'
import { useAuthStore } from '@/stores/authStore'

export async function apiFetch<T>(
  path: string,
  init: RequestInit,
  opts?: { skipAuth?: boolean },
): Promise<ApiResp<T>> {
  const token = useAuthStore.getState().accessToken

  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body != null) headers.set('Content-Type', 'application/json')
  if (!opts?.skipAuth && token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(path, { ...init, headers })
  const text = await res.text()
  if (!text) {
    return { ok: false, error: { code: 'BAD_RESPONSE', message: `空响应(${res.status})` } }
  }
  try {
    return JSON.parse(text) as ApiResp<T>
  } catch {
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('text/html')) {
      return { ok: false, error: { code: 'BAD_RESPONSE', message: '接口返回 HTML，请确认后端已启动且 /api 已代理到 3001' } }
    }
    return { ok: false, error: { code: 'BAD_RESPONSE', message: text } }
  }
}
