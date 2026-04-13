/**
 * Vercel deploy entry handler - Single serverless function for all API routes
 */
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createAnonClient, createUserClient } from './lib/supabase.js'
import { asyncHandler } from './lib/asyncHandler.js'
import { fail, ok } from './lib/http.js'
import { requireAuth } from './middleware/auth.js'
import { haversineKm } from './lib/geo.js'
import type { UserProfile, UserRole } from '../shared/types.js'
import type { Review } from '../shared/types.js'

// load env
dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * Helper functions
 */
function pseudoName(userId: string): string {
  const s = userId.replace(/-/g, '')
  return `用户${s.slice(0, 6)}`
}

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ok',
  })
})

/**
 * Auth Routes
 */
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : ''

  if (!email || !password) {
    res.status(400).json(fail('BAD_REQUEST', 'email/password 必填'))
    return
  }

  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined,
  })
  if (error) {
    res.status(400).json(fail('AUTH_ERROR', error.message))
    return
  }

  const accessToken = data.session?.access_token || null
  if (accessToken && data.user) {
    const userSb = createUserClient(accessToken)
    await userSb
      .from('user_profiles')
      .update({ display_name: displayName || null, contact_email: email })
      .eq('id', data.user.id)
  }

  res.json(
    ok({
      user: data.user ? { id: data.user.id, email: data.user.email || null } : null,
      session: data.session
        ? { access_token: data.session.access_token, refresh_token: data.session.refresh_token }
        : null,
      needsEmailConfirm: !data.session,
    }),
  )
}))

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) {
    res.status(400).json(fail('BAD_REQUEST', 'email/password 必填'))
    return
  }

  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    res.status(400).json(fail('AUTH_ERROR', error?.message || '登录失败'))
    return
  }

  const userSb = createUserClient(data.session.access_token)
  const { data: profile } = await userSb
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle<UserProfile>()

  res.json(
    ok({
      user: { id: data.user.id, email: data.user.email || null },
      profile: profile || null,
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    }),
  )
}))

app.post('/api/auth/logout', asyncHandler(async (req, res) => {
  res.json(ok({ loggedOut: true }))
}))

/**
 * Me Routes
 */
app.get('/api/me', requireAuth, asyncHandler(async (req, res) => {
  const supabase = createUserClient(req.auth!.accessToken)
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', req.auth!.userId)
    .maybeSingle<UserProfile>()

  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  res.json(
    ok({
      user: { id: req.auth!.userId, email: req.auth!.email },
      profile: data || null,
    }),
  )
}))

app.put('/api/me/profile', requireAuth, asyncHandler(async (req, res) => {
  const { display_name, avatar_url, contact_phone, contact_email } = req.body || {}

  const supabase = createUserClient(req.auth!.accessToken)
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      display_name: typeof display_name === 'string' ? display_name : null,
      avatar_url: typeof avatar_url === 'string' ? avatar_url : null,
      contact_phone: typeof contact_phone === 'string' ? contact_phone : null,
      contact_email: typeof contact_email === 'string' ? contact_email : null,
    })
    .eq('id', req.auth!.userId)
    .select('*')
    .maybeSingle<UserProfile>()

  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  res.json(ok({ profile: data || null }))
}))

app.put('/api/me/role', requireAuth, asyncHandler(async (req, res) => {
  const role = (req.body?.role || '') as UserRole
  if (!['user', 'merchant'].includes(role)) {
    res.status(400).json(fail('BAD_REQUEST', 'role 仅支持 user/merchant'))
    return
  }

  const supabase = createUserClient(req.auth!.accessToken)
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', req.auth!.userId)
    .select('*')
    .maybeSingle<UserProfile>()

  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  res.json(ok({ profile: data || null }))
}))

/**
 * Merchants Routes
 */
app.get('/api/merchants', asyncHandler(async (req, res) => {
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
  query = query.range(rangeFrom, rangeTo)

  const { data, error, count } = await query
  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  let items = (data as any[]) || []
  if (withGeo && radiusKm != null) {
    items = items
      .map((m) => ({
        ...m,
        distance_km:
          typeof m.latitude === 'number' && typeof m.longitude === 'number'
            ? Number((haversineKm(lat, lng, m.latitude, m.longitude) ?? 0).toFixed(2))
            : null,
      }))
      .filter((m) => (m.distance_km != null ? m.distance_km <= radiusKm : true))
  }

  res.json(
    ok({
      items,
      page,
      pageSize,
      total: count || 0,
      hasMore: rangeFrom + items.length < count,
    }),
  )
}))

app.get('/api/merchants/:id', asyncHandler(async (req, res) => {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle()

  if (error || !data) {
    res.status(404).json(fail('NOT_FOUND', '商户不存在'))
    return
  }

  res.json(ok({ merchant: data }))
}))

/**
 * Reviews Routes
 */
app.get('/api/merchants/:merchantId/reviews', asyncHandler(async (req, res) => {
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

app.post('/api/merchants/:merchantId/reviews', requireAuth, asyncHandler(async (req, res) => {
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
    .single<Review>()

  if (error) {
    res.status(500).json(fail('DB_ERROR', error.message))
    return
  }

  res.json(ok({ review: { ...data, author_display_name: pseudoName(data.author_user_id) } }))
}))

/**
 * Error handler middleware
 */
app.use((error: Error, req, res, next) => {
  void next
  const msg = error.message && error.message.startsWith('Missing env var:')
    ? error.message
    : '服务异常'
  res.status(500).json({
    ...fail('SERVER_ERROR', msg),
  })
})

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json(fail('NOT_FOUND', 'API not found'))
})

export default app
