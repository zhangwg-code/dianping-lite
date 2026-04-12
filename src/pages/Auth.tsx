import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Container from '@/components/Container'
import TopNav from '@/components/TopNav'
import { apiFetch } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile } from '../../shared/types'
import { getErrorMessage } from '@/utils/error'

type Mode = 'login' | 'register'

export default function Auth() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const redirect = sp.get('redirect') || '/'
  const auth = useAuthStore()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => (mode === 'login' ? '登录' : '注册'), [mode])

  useEffect(() => {
    if (auth.accessToken) nav(redirect, { replace: true })
  }, [auth.accessToken, nav, redirect])

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav />
      <Container>
        <div className="flex justify-center py-10">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex rounded-2xl bg-zinc-100 p-1">
              {([
                { k: 'login', t: '登录' },
                { k: 'register', t: '注册' },
              ] as const).map((x) => (
                <button
                  key={x.k}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    mode === x.k ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'
                  }`}
                  onClick={() => {
                    setMode(x.k)
                    setMessage(null)
                    setError(null)
                  }}
                >
                  {x.t}
                </button>
              ))}
            </div>

            <div className="mt-5 text-lg font-semibold text-zinc-900">{title}</div>
            <div className="mt-1 text-sm text-zinc-600">邮箱 + 密码（手机号验证码接口已预留）</div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            ) : null}

            <div className="mt-4 space-y-3">
              {mode === 'register' ? (
                <div>
                  <div className="text-xs text-zinc-500">昵称（可选）</div>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                    placeholder="例如：小王"
                  />
                </div>
              ) : null}
              <div>
                <div className="text-xs text-zinc-500">邮箱</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <div className="text-xs text-zinc-500">密码</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  placeholder="至少 6 位"
                />
              </div>

              <button
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:bg-orange-300"
                onClick={async () => {
                  setLoading(true)
                  setError(null)
                  setMessage(null)
                  try {
                    if (mode === 'register') {
                      const resp = await apiFetch<{
                        user: { id: string; email: string | null } | null
                        session: { access_token: string; refresh_token: string } | null
                        needsEmailConfirm: boolean
                      }>(
                        '/api/auth/register',
                        {
                          method: 'POST',
                          body: JSON.stringify({ email, password, displayName }),
                        },
                        { skipAuth: true },
                      )
                      if (resp.ok === false) throw new Error(resp.error.message)
                      if (resp.data.session && resp.data.user) {
                        auth.setSession({
                          accessToken: resp.data.session.access_token,
                          userId: resp.data.user.id,
                          email: resp.data.user.email,
                        })
                        await auth.refreshMe()
                        nav(redirect, { replace: true })
                        return
                      }
                      setMessage('注册成功，请到邮箱完成确认后再登录')
                      setMode('login')
                      return
                    }

                    const resp = await apiFetch<{
                      user: { id: string; email: string | null }
                      profile: UserProfile | null
                      session: { access_token: string; refresh_token: string }
                    }>(
                      '/api/auth/login',
                      {
                        method: 'POST',
                        body: JSON.stringify({ email, password }),
                      },
                      { skipAuth: true },
                    )
                    if (resp.ok === false) throw new Error(resp.error.message)
                    auth.setSession({
                      accessToken: resp.data.session.access_token,
                      userId: resp.data.user.id,
                      email: resp.data.user.email,
                    })
                    await auth.refreshMe()
                    nav(redirect, { replace: true })
                  } catch (e: unknown) {
                    setError(getErrorMessage(e) || '操作失败')
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                {mode === 'login' ? '登录' : '注册'}
              </button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
