import { Star } from 'lucide-react'

export default function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(5, value))
  const full = Math.floor(v)
  const half = v - full >= 0.5

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full
        const isHalf = i === full && half
        return (
          <Star
            key={i}
            className="text-orange-500"
            style={{ width: size, height: size }}
            fill={filled || isHalf ? 'currentColor' : 'none'}
            opacity={isHalf && !filled ? 0.6 : 1}
          />
        )
      })}
    </div>
  )
}

