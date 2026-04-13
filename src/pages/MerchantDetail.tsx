import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Merchant, Review } from '../../shared/types'
import Container from '@/components/Container'
import MerchantMap from '@/components/MerchantMap'
import ReviewComposer from '@/components/ReviewComposer'
import StarRating from '@/components/StarRating'
import TopNav from '@/components/TopNav'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch } from '@/utils/api'
import { formatDateTime } from '@/utils/format'

type ReviewItem = Review & { author_display_name?: string }

export default function MerchantDetail() {
  const { id } = useParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const userId = useAuthStore((s) => s.userId)
  const refreshMe = useAuthStore((s) => s.refreshMe)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canLoadMore = reviews.length < total

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const m = await apiFetch<{ merchant: Merchant }>(`/api/merchants/${id}`, { method: 'GET' })
      if (m.ok === false) {
        if (!cancelled) {
          setError(m.error.message)
          setMerchant(null)
          setLoading(false)
        }
        return
      }
      const r = await apiFetch<{ items: ReviewItem[]; total: number }>(
        `/api/merchants/${id}/reviews?page=1&pageSize=10`,
        { method: 'GET' },
      )
      if (!cancelled) {
        setMerchant(m.data.merchant)
        setReviews(r.ok === true ? r.data.items : [])
        setTotal(r.ok === true ? r.data.total : 0)
        setPage(1)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const title = useMemo(() => merchant?.name || '商家详情', [merchant?.name])

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav />
      <Container>
        <div className="py-6">
          {loading ? (
            <div className="h-40 animate-pulse rounded-3xl border border-zinc-200 bg-white" />
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : merchant ? (
            <>
              <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <div className="relative h-44 w-full bg-gradient-to-br from-orange-100 via-white to-blue-50">
                  <img
                    src={merchant.cover_url || '/covers/default.svg'}
                    alt={merchant.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget
                      if (img.src.endsWith('/covers/default.svg')) return
                      img.src = '/covers/default.svg'
                    }}
                  />
                </div>
                <div className="p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-zinc-900">{title}</div>
                      <div className="mt-1 text-sm text-zinc-600">
                        {merchant.category}
                        {merchant.city ? ` · ${merchant.city}` : ''}
                        {merchant.area ? ` · ${merchant.area}` : ''}
                      </div>
                      <div className="mt-2 text-sm text-zinc-700">{merchant.address}</div>
                      {merchant.opening_hours ? (
                        <div className="mt-1 text-xs text-zinc-500">营业时间：{merchant.opening_hours}</div>
                      ) : null}
                      {merchant.phone ? (
                        <div className="mt-1 text-xs text-zinc-500">电话：{merchant.phone}</div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StarRating value={merchant.avg_rating} size={16} />
                        <div className="text-sm font-semibold text-zinc-900">{merchant.avg_rating.toFixed(1)}</div>
                      </div>
                      <div className="mt-1 text-xs text-zinc-600">共 {merchant.review_count} 条评价</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  {!accessToken ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="text-sm text-zinc-700">登录后即可发布评价</div>
                      <Link
                        to={`/auth?redirect=${encodeURIComponent(`/merchant/${merchant.id}`)}`}
                        className="mt-3 inline-flex rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                      >
                        去登录
                      </Link>
                    </div>
                  ) : (
                    <ReviewComposer
                      onSubmit={async ({ rating, content }) => {
                        const resp = await apiFetch<{ review: Review }>(
                          `/api/merchants/${merchant.id}/reviews`,
                          { method: 'POST', body: JSON.stringify({ rating, content }) },
                        )
                        if (resp.ok) {
                          // Reload merchant data to update rating stats
                          const m = await apiFetch<{ merchant: Merchant }>(`/api/merchants/${merchant.id}`, { method: 'GET' })
                          if (m.ok) {
                            setMerchant(m.data.merchant)
                          }
                          // Reload reviews
                          const r = await apiFetch<{ items: ReviewItem[]; total: number }>(
                            `/api/merchants/${merchant.id}/reviews?page=1&pageSize=10`,
                            { method: 'GET' },
                          )
                          if (r.ok) {
                            setReviews(r.data.items)
                            setTotal(r.data.total)
                            setPage(1)
                          }
                        }
                      }}
                    />
                  )}

                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-zinc-900">评价</div>
                      <div className="text-xs text-zinc-500">按时间排序</div>
                    </div>
                    <div className="mt-3 space-y-4">
                      {reviews.map((r) => (
                        <div key={r.id} className="rounded-2xl border border-zinc-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-zinc-900">
                                {r.author_display_name || '用户'}
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <StarRating value={r.rating} />
                                <span className="text-xs text-zinc-500">{formatDateTime(r.created_at)}</span>
                              </div>
                            </div>

                            {userId && r.author_user_id === userId ? (
                              <button
                                className="text-xs text-red-600 hover:underline"
                                onClick={async () => {
                                  const resp = await apiFetch<{ deleted: boolean }>(`/api/reviews/${r.id}`, {
                                    method: 'DELETE',
                                  })
                                  if (resp.ok) {
                                    setReviews((xs) => xs.filter((x) => x.id !== r.id))
                                    setTotal((t) => Math.max(0, t - 1))
                                  }
                                }}
                              >
                                删除
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-3 text-sm text-zinc-800">{r.content}</div>
                          {r.merchant_reply ? (
                            <div className="mt-3 rounded-xl bg-zinc-50 p-3">
                              <div className="text-xs font-semibold text-zinc-700">商家回复</div>
                              <div className="mt-1 text-sm text-zinc-800">{r.merchant_reply}</div>
                              {r.reply_at ? (
                                <div className="mt-1 text-xs text-zinc-500">{formatDateTime(r.reply_at)}</div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {canLoadMore ? (
                      <div className="mt-4 flex justify-center">
                        <button
                          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
                          onClick={async () => {
                            const next = page + 1
                            const r = await apiFetch<{ items: ReviewItem[]; total: number }>(
                              `/api/merchants/${merchant.id}/reviews?page=${next}&pageSize=10`,
                              { method: 'GET' },
                            )
                            if (r.ok) {
                              setReviews((xs) => [...xs, ...r.data.items])
                              setTotal(r.data.total)
                              setPage(next)
                            }
                          }}
                        >
                          加载更多
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">商家信息</div>
                    <div className="mt-2 text-sm text-zinc-700">{merchant.description || '暂无简介'}</div>
                  </div>

                  {merchant.latitude != null && merchant.longitude != null ? (
                    <MerchantMap lat={merchant.latitude} lng={merchant.longitude} name={merchant.name} />
                  ) : (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                      暂无地理位置
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </Container>
    </div>
  )
}
