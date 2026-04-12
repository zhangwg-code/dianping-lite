/// <reference types="express" />
import type { UserProfile } from '../shared/types'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        accessToken: string
        userId: string
        email: string | null
      }
      me?: {
        profile: UserProfile | null
      }
    }
  }
}

export {}

