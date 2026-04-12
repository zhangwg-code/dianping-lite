import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Merchant, Review, UserProfile } from '../../shared/types'
import Container from '@/components/Container'
import TopNav from '@/components/TopNav'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch } from '@/utils/api'
import MerchantFormPanel from '@/pages/merchantAdmin/MerchantFormPanel'
import ReviewsPanel from '@/pages/merchantAdmin/ReviewsPanel'
import Sidebar from '@/pages/merchantAdmin/Sidebar'
import { getErrorMessage } from '@/utils/error'

type ReviewItem = Review & { author_display_name?: string }

export default function MerchantAdmin() {
  const auth = useAuthStore()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const redirect = sp.get('redirect')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [tab, setTab] = useState<'profile' | 'reviews'>('profile')
  const [form, setForm] = useState<Partial<Merchant>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})

  const isMerchant = profile?.role === 'merchant'

  useEffect(() => {
    ;(async () => {
      await auth.refreshMe()
      if (!auth.accessToken) {
        nav(`/auth?redirect=${encodeURIComponent('/merchant-admin')}`, { replace: true })
        return
      }
      const me = await apiFetch<{ user: { id: string; email: string | null }; profile: UserProfile | null }>('/api/me', {
        method: 'GET',
      })
      if (me.ok) setProfile(me.data.profile)
    })()
  }, [auth, nav])

  useEffect(() => {
    if (!auth.accessToken) return
    ;(async () => {
      const r = await apiFetch<{ merchant: Merchant | null }>('/api/merchants/my', { method: 'GET' })
      if (r.ok) {
        setMerchant(r.data.merchant)
        setForm(r.data.merchant || {})
      }
    })()
  }, [auth.accessToken])

  useEffect(() => {
    if (!merchant?.id) return
    ;(async () => {
      const r = await apiFetch<{ items: ReviewItem[] }>(`/api/merchants/${merchant.id}/reviews?page=1&pageSize=20`, {
        method: 'GET',
      })
      if (r.ok) setReviews(r.data.items)
    })()
  }, [merchant?.id])

  const canEdit = isMerchant && !!auth.accessToken
  const title = useMemo(() => (merchant ? '编辑商家信息' : '创建商家'), [merchant])

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav />
      <Container>
        <div className="py-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Sidebar tab={tab} setTab={setTab} />
            </div>

            <div className="lg:col-span-3">
              {message ? (
                <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {message}
                </div>
              ) : null}
              {error ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              ) : null}

              {!isMerchant ? (
                <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm font-semibold text-zinc-900">你当前是普通用户</div>
                  <div className="mt-1 text-sm text-zinc-600">切换为商家后可创建/编辑商家并回复评价</div>
                  <button
                    className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                    onClick={async () => {
                      setError(null)
                      const r = await apiFetch<{ profile: UserProfile | null }>('/api/me/role', {
                        method: 'PUT',
                        body: JSON.stringify({ role: 'merchant' }),
                      })
                      if (r.ok === false) {
                        setError(r.error.message)
                        return
                      }
                      setProfile(r.data.profile)
                      setMessage('已切换为商家身份')
                    }}
                  >
                    立即成为商家
                  </button>
                </div>
              ) : null}

              {tab === 'profile' ? (
                <MerchantFormPanel
                  title={title}
                  canEdit={canEdit}
                  merchant={merchant}
                  form={form}
                  setForm={(u) => setForm(u)}
                  saving={saving}
                  onSave={async () => {
                    setSaving(true)
                    setMessage(null)
                    setError(null)
                    try {
                      const payload = {
                        name: form.name,
                        category: form.category,
                        city: form.city || null,
                        area: form.area || null,
                        address: form.address,
                        phone: form.phone || null,
                        opening_hours: form.opening_hours || null,
                        latitude: typeof form.latitude === 'number' ? form.latitude : null,
                        longitude: typeof form.longitude === 'number' ? form.longitude : null,
                        cover_url: typeof form.cover_url === 'string' && form.cover_url.trim() ? form.cover_url.trim() : null,
                        description: form.description || null,
                      }
                      const resp = merchant
                        ? await apiFetch<{ merchant: Merchant }>(`/api/merchants/${merchant.id}`, {
                            method: 'PUT',
                            body: JSON.stringify(payload),
                          })
                        : await apiFetch<{ merchant: Merchant }>(`/api/merchants`, {
                            method: 'POST',
                            body: JSON.stringify(payload),
                          })
                      if (resp.ok === false) throw new Error(resp.error.message)
                      setMerchant(resp.data.merchant)
                      setForm(resp.data.merchant)
                      setMessage('保存成功')
                    } catch (e: unknown) {
                      setError(getErrorMessage(e) || '保存失败')
                    } finally {
                      setSaving(false)
                    }
                  }}
                />
              ) : (
                <ReviewsPanel
                  canEdit={canEdit}
                  merchantExists={!!merchant}
                  reviews={reviews}
                  replyDraft={replyDraft}
                  setReplyDraft={(u) => setReplyDraft(u)}
                  onSubmitReply={async (reviewId, reply) => {
                    setError(null)
                    setMessage(null)
                    const resp = await apiFetch<{ review: Review }>(`/api/reviews/${reviewId}/reply`, {
                      method: 'PUT',
                      body: JSON.stringify({ reply }),
                    })
                    if (resp.ok === false) {
                      setError(resp.error.message)
                      return
                    }
                    setReviews((xs) => xs.map((x) => (x.id === reviewId ? { ...x, ...resp.data.review } : x)))
                    setMessage('已回复')
                  }}
                />
              )}

              {redirect ? (
                <div className="mt-4 text-center text-sm">
                  <Link to={redirect} className="text-blue-600 hover:underline">
                    返回
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
