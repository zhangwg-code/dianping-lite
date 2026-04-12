import { Star } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function ReviewComposer({
  onSubmit,
  disabled,
}: {
  onSubmit: (p: { rating: number; content: string }) => Promise<void>
  disabled?: boolean
}) {
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(() => {
    return !disabled && !submitting && content.trim().length > 0 && content.trim().length <= 1000
  }, [content, disabled, submitting])

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">写评价</div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const v = i + 1
            const active = v <= rating
            return (
              <button
                key={v}
                type="button"
                className="p-1"
                onClick={() => setRating(v)}
                aria-label={`评分 ${v}`}
              >
                <Star className="h-5 w-5 text-orange-500" fill={active ? 'currentColor' : 'none'} />
              </button>
            )
          })}
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="说说你的真实体验…"
        className="mt-3 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-zinc-500">{content.trim().length}/1000</div>
        <button
          type="button"
          disabled={!canSubmit}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
          onClick={async () => {
            if (!canSubmit) return
            setSubmitting(true)
            try {
              await onSubmit({ rating, content: content.trim() })
              setContent('')
              setRating(5)
            } finally {
              setSubmitting(false)
            }
          }}
        >
          发布
        </button>
      </div>
    </div>
  )
}

