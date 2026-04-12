import { useEffect, useState } from 'react'
import type { Merchant } from '../../shared/types'
import Container from '@/components/Container'
import MerchantCard from '@/components/MerchantCard'
import TopNav from '@/components/TopNav'
import { apiFetch } from '@/utils/api'

export default function Home() {
  const [items, setItems] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const resp = await apiFetch<{ items: Merchant[] }>('/api/merchants?page=1&pageSize=8', { method: 'GET' })
      if (!cancelled) {
        setItems(resp.ok ? resp.data.items : [])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav />
      <Container>
        <div className="py-8">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">本地好店，轻松开逛</div>
            <div className="mt-2 text-sm text-zinc-600">搜索商家名称，查看评分与最新评价</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['餐饮', '娱乐', '购物'].map((c) => (
                <a
                  key={c}
                  href={`/search?category=${encodeURIComponent(c)}`}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 hover:bg-white"
                >
                  {c}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">推荐商家</div>
              <div className="mt-1 text-xs text-zinc-600">来自数据库初始化示例数据</div>
            </div>
            <a href="/search" className="text-sm text-blue-600 hover:underline">
              去搜索
            </a>
          </div>

          {loading ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((m) => (
                <MerchantCard key={m.id} merchant={m} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
