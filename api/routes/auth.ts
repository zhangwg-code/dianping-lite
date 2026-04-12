/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'
import { createAnonClient, createUserClient } from '../lib/supabase.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { fail, ok } from '../lib/http.js'
import type { UserProfile } from '../../shared/types.js'

const router = Router()

/**
 * User Login
 * POST /api/auth/register
 */
router.post('/register', asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.json(ok({ loggedOut: true }))
}))

router.post('/otp/send', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : ''
  if (!phone) {
    res.status(400).json(fail('BAD_REQUEST', 'phone 必填'))
    return
  }
  const supabase = createAnonClient()
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) {
    res.status(400).json(fail('AUTH_ERROR', error.message))
    return
  }
  res.json(ok({ sent: true }))
}))

router.post('/otp/verify', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : ''
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
  if (!phone || !token) {
    res.status(400).json(fail('BAD_REQUEST', 'phone/token 必填'))
    return
  }
  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error || !data.session || !data.user) {
    res.status(400).json(fail('AUTH_ERROR', error?.message || '验证码登录失败'))
    return
  }
  res.json(
    ok({
      user: { id: data.user.id, email: data.user.email || null },
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    }),
  )
}))

export default router
