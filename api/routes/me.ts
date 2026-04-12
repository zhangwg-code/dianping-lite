import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createUserClient } from '../lib/supabase.js'
import { fail, ok } from '../lib/http.js'
import type { UserProfile, UserRole } from '../../shared/types.js'

const router = Router()

router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

router.put('/profile', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

router.put('/role', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

export default router
