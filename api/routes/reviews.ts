import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createAnonClient, createUserClient } from '../lib/supabase.js'
import { fail, ok } from '../lib/http.js'
import type { Review, UserProfile } from '../../shared/types.js'

const router = Router()

function pseudoName(userId: string): string {
  const s = userId.replace(/-/g, '')
  return `用户${s.slice(0, 6)}`
}

router.get('/merchant/:merchantId', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)))
  const rangeFrom = (page - 1) * pageSize
  const rangeTo = rangeFrom + pageSize - 1

  const supabase = createAnonClient()
  const { data, error, count } = await supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('merchant_id', req.params.merchantId)
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)
  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  const items = (data as Review[]).map((r) => ({
    ...r,
    author_display_name: pseudoName(r.author_user_id),
  }))

  res.json(ok({ items, page, pageSize, total: count || 0 }))
}))

router.post('/merchant/:merchantId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const rating = Number(req.body?.rating)
  const content = typeof req.body?.content === 'string' ? req.body.content : ''
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    res.status(400).json(fail('BAD_REQUEST', 'rating 必须为 1-5'))
    return
  }
  if (!content || content.length > 1000) {
    res.status(400).json(fail('BAD_REQUEST', 'content 不能为空且不超过 1000 字'))
    return
  }

  const supabase = createUserClient(req.auth!.accessToken)
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      merchant_id: req.params.merchantId,
      author_user_id: req.auth!.userId,
      rating,
      content,
    })
    .select('*')
    .maybeSingle<Review>()

  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  res.json(ok({ review: data }))
}))

router.delete('/:reviewId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const supabase = createUserClient(req.auth!.accessToken)
  const { error } = await supabase.from('reviews').delete().eq('id', req.params.reviewId)
  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }
  res.json(ok({ deleted: true }))
}))

async function ensureMerchantRole(accessToken: string, userId: string): Promise<boolean> {
  const supabase = createUserClient(accessToken)
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle<Pick<UserProfile, 'role'>>()
  if (error) return false
  return data?.role === 'merchant'
}

router.put('/:reviewId/reply', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const hasRole = await ensureMerchantRole(req.auth!.accessToken, req.auth!.userId)
  if (!hasRole) {
    res.status(403).json(fail('FORBIDDEN', '需要商家身份'))
    return
  }
  const reply = typeof req.body?.reply === 'string' ? req.body.reply.trim() : ''
  if (!reply || reply.length > 1000) {
    res.status(400).json(fail('BAD_REQUEST', 'reply 不能为空且不超过 1000 字'))
    return
  }

  const supabase = createUserClient(req.auth!.accessToken)
  const { data, error } = await supabase
    .from('reviews')
    .update({ merchant_reply: reply, reply_at: new Date().toISOString() })
    .eq('id', req.params.reviewId)
    .select('*')
    .maybeSingle<Review>()
  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }
  if (!data) {
    res.status(404).json(fail('NOT_FOUND', '评价不存在或无权限'))
    return
  }
  res.json(ok({ review: data }))
}))

export default router
