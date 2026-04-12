export type UserRole = 'user' | 'merchant' | 'admin'

export type UserProfile = {
  id: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  contact_phone: string | null
  contact_email: string | null
  created_at: string
  updated_at: string
}

export type Merchant = {
  id: string
  owner_user_id: string
  name: string
  category: string
  city: string | null
  area: string | null
  address: string
  phone: string | null
  opening_hours: string | null
  latitude: number | null
  longitude: number | null
  cover_url: string | null
  description: string | null
  avg_rating: number
  review_count: number
  created_at: string
  updated_at: string
}

export type Review = {
  id: string
  merchant_id: string
  author_user_id: string
  rating: number
  content: string
  merchant_reply: string | null
  reply_at: string | null
  created_at: string
  updated_at: string
}

export type ApiError = { code: string; message: string }
export type ApiResp<T> = { ok: true; data: T } | { ok: false; error: ApiError }

