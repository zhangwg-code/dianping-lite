import type { NextFunction, Request, Response } from 'express'
import { createAnonClient } from '../lib/supabase.js'
import { fail } from '../lib/http.js'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer\s+(.+)$/)
  if (!m) {
    res.status(401).json(fail('UNAUTHORIZED', '需要登录'))
    return
  }

  const token = m[1]
  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json(fail('UNAUTHORIZED', '登录已失效'))
    return
  }

  req.auth = {
    accessToken: token,
    userId: data.user.id,
    email: data.user.email || null,
  }
  next()
}

