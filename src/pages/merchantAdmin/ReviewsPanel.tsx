import type { Review } from '../../../shared/types'
import { formatDateTime } from '@/utils/format'

type ReviewItem = Review & { author_display_name?: string }

export default function ReviewsPanel({
  canEdit,
  merchantExists,
  reviews,
  replyDraft,
  setReplyDraft,
  onSubmitReply,
}: {
  canEdit: boolean
  merchantExists: boolean
  reviews: ReviewItem[]
  replyDraft: Record<string, string>
  setReplyDraft: (u: (prev: Record<string, string>) => Record<string, string>) => void
  onSubmitReply: (reviewId: string, reply: string) => Promise<void>
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="text-lg font-semibold text-zinc-900">评价列表</div>
      <div className="mt-1 text-sm text-zinc-600">可对你的商家评价进行回复</div>
      {!merchantExists ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          你还没有创建商家，先去“商家资料”创建。
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-medium text-zinc-900">{r.author_display_name || '用户'}</div>
              <div className="mt-1 text-xs text-zinc-500">{formatDateTime(r.created_at)}</div>
              <div className="mt-3 text-sm text-zinc-800">{r.content}</div>
              <div className="mt-3">
                <div className="text-xs font-semibold text-zinc-700">商家回复</div>
                <textarea
                  value={replyDraft[r.id] ?? r.merchant_reply ?? ''}
                  onChange={(e) =>
                    setReplyDraft((s) => ({
                      ...s,
                      [r.id]: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="填写你的回复..."
                />
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    {r.reply_at ? `上次回复：${formatDateTime(r.reply_at)}` : '尚未回复'}
                  </div>
                  <button
                    disabled={!canEdit}
                    className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:bg-orange-300"
                    onClick={() => onSubmitReply(r.id, (replyDraft[r.id] ?? '').trim())}
                  >
                    提交回复
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

