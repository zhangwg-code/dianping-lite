import { Search, Store, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Container from '@/components/Container'

export default function TopNav() {
  const nav = useNavigate()
  const loc = useLocation()
  const { accessToken, profile, clear } = useAuthStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const isAuthed = !!accessToken
  const displayName = useMemo(() => {
    if (profile?.display_name) return profile.display_name
    return '未命名'
  }, [profile?.display_name])

  return (
    <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <Container>
        <div className="flex h-14 items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-zinc-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
              点
            </div>
            <span className="hidden sm:inline">点评Lite</span>
          </Link>

          <form
            className="ml-2 flex flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault()
              const v = q.trim()
              nav(v ? `/search?q=${encodeURIComponent(v)}` : '/search')
            }}
          >
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索商家名称"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none"
            />
          </form>

          {!isAuthed ? (
            <Link
              to={`/auth?redirect=${encodeURIComponent(loc.pathname + loc.search)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              <User className="h-4 w-4" />
              登录
            </Link>
          ) : (
            <div className="relative">
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                onClick={() => setOpen((v) => !v)}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-700">
                  {displayName.slice(0, 1)}
                </div>
                <span className="hidden sm:inline">{displayName}</span>
              </button>

              {open ? (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                  <Link
                    to="/merchant-admin"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                    onClick={() => setOpen(false)}
                  >
                    <Store className="h-4 w-4" />
                    商家管理
                  </Link>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                    onClick={() => {
                      setOpen(false)
                      clear()
                      nav('/')
                    }}
                  >
                    退出登录
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

