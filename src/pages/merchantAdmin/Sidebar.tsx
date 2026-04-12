export default function Sidebar({
  tab,
  setTab,
}: {
  tab: 'profile' | 'reviews'
  setTab: (t: 'profile' | 'reviews') => void
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <button
        className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
          tab === 'profile' ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
        }`}
        onClick={() => setTab('profile')}
      >
        商家资料
      </button>
      <button
        className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-sm ${
          tab === 'reviews' ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
        }`}
        onClick={() => setTab('reviews')}
      >
        评价列表
      </button>
    </div>
  )
}

