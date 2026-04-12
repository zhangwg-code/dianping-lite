import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createAnonClient, createUserClient } from '../lib/supabase.js'
import { fail, ok } from '../lib/http.js'
import { haversineKm } from '../lib/geo.js'
import type { Merchant, UserProfile } from '../../shared/types.js'
import type { Review } from '../../shared/types.js'

const router = Router()

type MerchantWithDistance = Merchant & { distance_km: number | null }

function pseudoName(userId: string): string {
  const s = userId.replace(/-/g, '')
  return `用户${s.slice(0, 6)}`
}

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const category = typeof req.query.category === 'string' ? req.query.category : ''
  const city = typeof req.query.city === 'string' ? req.query.city : ''
  const area = typeof req.query.area === 'string' ? req.query.area : ''
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'rating'
  const minRating = Number(req.query.minRating || 0)
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)))

  const lat = req.query.lat != null ? Number(req.query.lat) : null
  const lng = req.query.lng != null ? Number(req.query.lng) : null
  const radiusKm = req.query.radiusKm != null ? Number(req.query.radiusKm) : null
  const withGeo =
    typeof lat === 'number' &&
    !Number.isNaN(lat) &&
    typeof lng === 'number' &&
    !Number.isNaN(lng)

  const supabase = createAnonClient()
  let query = supabase.from('merchants').select('*', { count: 'exact' })

  if (q) query = query.ilike('name', `%${q}%`)
  if (category) query = query.eq('category', category)
  if (city) query = query.eq('city', city)
  if (area) query = query.eq('area', area)
  if (!Number.isNaN(minRating) && minRating > 0) query = query.gte('avg_rating', minRating)

  if (sort === 'hot') {
    query = query.order('review_count', { ascending: false }).order('avg_rating', { ascending: false })
  } else {
    query = query.order('avg_rating', { ascending: false }).order('review_count', { ascending: false })
  }

  const rangeFrom = (page - 1) * pageSize
  const rangeTo = rangeFrom + pageSize - 1

  if (sort !== 'distance' || !withGeo) {
    const { data, error, count } = await query.range(rangeFrom, rangeTo)
    if (error) {
      res.status(500).json(fail('DB_ERROR', error.message))
      return
    }
    res.json(ok({ items: data as Merchant[], page, pageSize, total: count || 0 }))
    return
  }

  const { data, error } = await query.limit(200)
  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  const enriched: MerchantWithDistance[] = (data as Merchant[]).map((m) => {
    const d =
      m.latitude != null && m.longitude != null ? haversineKm(lat!, lng!, m.latitude, m.longitude) : null
    return { ...m, distance_km: d }
  })

  const filtered =
    typeof radiusKm === 'number' && !Number.isNaN(radiusKm)
      ? enriched.filter((m) => m.distance_km != null && m.distance_km <= radiusKm)
      : enriched

  filtered.sort((a, b) => {
    if (a.distance_km == null && b.distance_km == null) return 0
    if (a.distance_km == null) return 1
    if (b.distance_km == null) return -1
    return a.distance_km - b.distance_km
  })

  const total = filtered.length
  const items = filtered.slice(rangeFrom, rangeFrom + pageSize)
  res.json(ok({ items, page, pageSize, total }))
}))

router.get('/my', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const supabase = createUserClient(req.auth!.accessToken)
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('owner_user_id', req.auth!.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Merchant>()
  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }
  res.json(ok({ merchant: data || null }))
}))

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle<Merchant>()
  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }
  if (!data) {
    res.status(404).json(fail('NOT_FOUND', '商家不存在'))
    return
  }
  res.json(ok({ merchant: data }))
}))

router.get('/:id/reviews', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)))
  const rangeFrom = (page - 1) * pageSize
  const rangeTo = rangeFrom + pageSize - 1

  const supabase = createAnonClient()
  const { data, error, count } = await supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('merchant_id', req.params.id)
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

router.post('/:id/reviews', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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
      merchant_id: req.params.id,
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

router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const hasRole = await ensureMerchantRole(req.auth!.accessToken, req.auth!.userId)
  if (!hasRole) {
    res.status(403).json(fail('FORBIDDEN', '需要商家身份'))
    return
  }

  const body = req.body || {}
  if (typeof body.name !== 'string' || typeof body.category !== 'string' || typeof body.address !== 'string') {
    res.status(400).json(fail('BAD_REQUEST', '缺少必填字段：name/category/address'))
    return
  }

  const supabase = createUserClient(req.auth!.accessToken)
  const { data, error } = await supabase
    .from('merchants')
    .insert({
      owner_user_id: req.auth!.userId,
      name: body.name,
      category: body.category,
      city: typeof body.city === 'string' ? body.city : null,
      area: typeof body.area === 'string' ? body.area : null,
      address: body.address,
      phone: typeof body.phone === 'string' ? body.phone : null,
      opening_hours: typeof body.opening_hours === 'string' ? body.opening_hours : null,
      latitude: typeof body.latitude === 'number' ? body.latitude : null,
      longitude: typeof body.longitude === 'number' ? body.longitude : null,
      cover_url: typeof body.cover_url === 'string' ? body.cover_url : null,
      description: typeof body.description === 'string' ? body.description : null,
    })
    .select('*')
    .maybeSingle<Merchant>()

  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  res.json(ok({ merchant: data }))
}))

router.put('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const hasRole = await ensureMerchantRole(req.auth!.accessToken, req.auth!.userId)
  if (!hasRole) {
    res.status(403).json(fail('FORBIDDEN', '需要商家身份'))
    return
  }
  const body = req.body || {}
  const supabase = createUserClient(req.auth!.accessToken)
  const { data, error } = await supabase
    .from('merchants')
    .update({
      name: typeof body.name === 'string' ? body.name : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      city: typeof body.city === 'string' ? body.city : undefined,
      area: typeof body.area === 'string' ? body.area : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      opening_hours: typeof body.opening_hours === 'string' ? body.opening_hours : undefined,
      latitude: typeof body.latitude === 'number' ? body.latitude : undefined,
      longitude: typeof body.longitude === 'number' ? body.longitude : undefined,
      cover_url: typeof body.cover_url === 'string' ? body.cover_url : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
    })
    .eq('id', req.params.id)
    .select('*')
    .maybeSingle<Merchant>()

  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }
  if (!data) {
    res.status(404).json(fail('NOT_FOUND', '商家不存在或无权限'))
    return
  }
  res.json(ok({ merchant: data }))
}))

export default router
