import type { ApiResp } from '../../shared/types.js'

export function ok<T>(data: T): ApiResp<T> {
  return { ok: true, data }
}

export function fail(code: string, message: string): ApiResp<never> {
  return { ok: false, error: { code, message } }
}

