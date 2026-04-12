import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from './env.js'

type Sb = SupabaseClient

export function createAnonClient(): Sb {
  const { url, anonKey } = getSupabaseEnv()
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function createUserClient(accessToken: string): Sb {
  const { url, anonKey } = getSupabaseEnv()
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export function createServiceRoleClient(): Sb {
  const { url, serviceRoleKey } = getSupabaseEnv()
  if (!serviceRoleKey) {
    throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

