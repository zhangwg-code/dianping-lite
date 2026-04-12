import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Merchant } from '../../shared/types'
import Container from '@/components/Container'
import MerchantCard from '@/components/MerchantCard'
import TopNav from '@/components/TopNav'
import { apiFetch } from '@/utils/api'

type SearchState = {
  items: MerchantWithDistance[]
  page: number
  pageSize: number
  total: number
  loading: boolean
  error: string | null
}

type MerchantWithDistance = Merchant & { distance_km?: number | null }

export default function Search() {
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') || ''
  const category = sp.get('category') || ''
  const sort = sp.get('sort') || 'rating'
  const minRating = sp.get('minRating') || ''

  const [state, setState] = useState<SearchState>({
    items: [],
    page: 1,
    pageSize: 12,
    total: 0,
    loading: true,
    error: null,
  })

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (category) p.set('category', category)
    if (sort) p.set('sort', sort)
    if (minRating) p.set('minRating', minRating)
    p.set('page', String(state.page))
    p.set('pageSize', String(state.pageSize))
    return p.toString()
  }, [q, category, sort, minRating, state.page, state.pageSize])

  useEffect(() => {
    setState((s) => ({ ...s, page: 1 }))
  }, [q, category, sort, minRating])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setState((s) => ({ ...s, loading: true, error: null }))
      const resp = await apiFetch<{ items: MerchantWithDistance[]; total: number; page: number; pageSize: number }>(
        `/api/merchants?${qs}`,
        { method: 'GET' },
      )
      if (cancelled) return
      if (resp.ok === false) {
        setState((s) => ({ ...s, loading: false, error: resp.error.message }))
        return
      }
      setState((s) => ({
        ...s,
        loading: false,
        total: resp.data.total,
        page: resp.data.page,
        pageSize: resp.data.pageSize,
        items: resp.data.items,
      }))
    })()
    return () => {
      cancelled = true
    }
  }, [qs])

  const canLoadMore = state.items.length < state.total

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav />
      <Container>
        <div className="py-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <div className="text-xs text-zinc-500">分类</div>
                <select
                  value={category}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v) sp.set('category', v)
                    else sp.delete('category')
                    setSp(sp, { replace: true })
                  }}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">全部</option>
                  <option value="餐饮">餐饮</option>
                  <option value="娱乐">娱乐</option>
                  <option value="购物">购物</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-zinc-500">排序</div>
                <select
                  value={sort}
                  onChange={(e) => {
                    const v = e.target.value
                    sp.set('sort', v)
                    setSp(sp, { replace: true })
                  }}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="rating">评分优先</option>
                  <option value="hot">热度优先</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-zinc-500">最低评分</div>
                <select
                  value={minRating}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v) sp.set('minRating', v)
                    else sp.delete('minRating')
                    setSp(sp, { replace: true })
                  }}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">不限</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                  onClick={() => {
                    setSp(new URLSearchParams(), { replace: true })
                  }}
                >
                  清空筛选
                </button>
              </div>
            </div>
          </div>

          {state.error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {state.loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
                ))
              : state.items.map((m) => <MerchantCard key={m.id} merchant={m} />)}
          </div>

          {!state.loading && state.items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-center">
              <div className="text-sm font-semibold text-zinc-900">没有找到结果</div>
              <div className="mt-2 text-sm text-zinc-600">换个关键词或调整筛选试试</div>
            </div>
          ) : null}

          {!state.loading && canLoadMore ? (
            <div className="mt-6 flex justify-center">
              <button
                className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
                onClick={() => setState((s) => ({ ...s, page: s.page + 1 }))}
              >
                加载更多
              </button>
            </div>
          ) : null}
        </div>
      </Container>
    </div>
  )
}
