import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '../../shared/types'
import { apiFetch } from '@/utils/api'

type AuthState = {
  accessToken: string | null
  userId: string | null
  email: string | null
  profile: UserProfile | null
  setSession: (p: { accessToken: string; userId: string; email: string | null }) => void
  clear: () => void
  refreshMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      userId: null,
      email: null,
      profile: null,
      setSession: ({ accessToken, userId, email }) => set({ accessToken, userId, email }),
      clear: () => set({ accessToken: null, userId: null, email: null, profile: null }),
      refreshMe: async () => {
        const token = get().accessToken
        if (!token) {
          set({ profile: null })
          return
        }
        const resp = await apiFetch<{ user: { id: string; email: string | null }; profile: UserProfile | null }>(
          '/api/me',
          { method: 'GET' },
        )
        if (resp.ok) {
          set({ userId: resp.data.user.id, email: resp.data.user.email, profile: resp.data.profile })
        }
      },
    }),
    {
      name: 'dianpinglite_auth',
      partialize: (s) => ({ accessToken: s.accessToken, userId: s.userId, email: s.email }),
    },
  ),
)

