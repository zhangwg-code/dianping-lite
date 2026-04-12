import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Merchant } from '../../shared/types'
import StarRating from '@/components/StarRating'

export default function MerchantCard({ merchant }: { merchant: Merchant & { distance_km?: number | null } }) {
  const coverUrl = merchant.cover_url || '/covers/default.svg'
  return (
    <Link
      to={`/merchant/${merchant.id}`}
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative h-36 w-full bg-gradient-to-br from-orange-100 via-white to-blue-50">
        <img
          src={coverUrl}
          alt={merchant.name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget
            if (img.src.endsWith('/covers/default.svg')) return
            img.src = '/covers/default.svg'
          }}
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="line-clamp-1 text-sm font-semibold text-zinc-900">{merchant.name}</div>
            <div className="mt-1 text-xs text-zinc-600">{merchant.category}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <StarRating value={merchant.avg_rating} />
              <span className="text-xs text-zinc-700">{merchant.avg_rating.toFixed(1)}</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">{merchant.review_count} 条评价</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{merchant.address}</span>
        </div>
        {typeof merchant.distance_km === 'number' ? (
          <div className="mt-2 text-xs text-zinc-500">距离约 {merchant.distance_km.toFixed(1)} km</div>
        ) : null}
      </div>
    </Link>
  )
}
