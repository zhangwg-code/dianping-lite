import type { Merchant } from '../../../shared/types'

export default function MerchantFormPanel({
  title,
  canEdit,
  merchant,
  form,
  setForm,
  saving,
  onSave,
}: {
  title: string
  canEdit: boolean
  merchant: Merchant | null
  form: Partial<Merchant>
  setForm: (u: (prev: Partial<Merchant>) => Partial<Merchant>) => void
  saving: boolean
  onSave: () => Promise<void>
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="text-lg font-semibold text-zinc-900">{title}</div>
      <div className="mt-1 text-sm text-zinc-600">仅可编辑你名下的商家</div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="名称" value={form.name || ''} onChange={(v) => setForm((s) => ({ ...s, name: v }))} />
        <Field
          label="分类"
          value={form.category || ''}
          onChange={(v) => setForm((s) => ({ ...s, category: v }))}
          placeholder="餐饮/娱乐/购物"
        />
        <div className="md:col-span-2">
          <Field
            label="封面图 URL（可选）"
            value={form.cover_url || ''}
            onChange={(v) => setForm((s) => ({ ...s, cover_url: v }))}
            placeholder="https://... 或 /covers/xxx.svg"
          />
        </div>
        <Field label="城市" value={form.city || ''} onChange={(v) => setForm((s) => ({ ...s, city: v }))} />
        <Field label="区域" value={form.area || ''} onChange={(v) => setForm((s) => ({ ...s, area: v }))} />
        <div className="md:col-span-2">
          <Field
            label="地址"
            value={form.address || ''}
            onChange={(v) => setForm((s) => ({ ...s, address: v }))}
            placeholder="例如：xx路xx号"
          />
        </div>
        <Field label="电话" value={form.phone || ''} onChange={(v) => setForm((s) => ({ ...s, phone: v }))} />
        <Field
          label="营业时间"
          value={form.opening_hours || ''}
          onChange={(v) => setForm((s) => ({ ...s, opening_hours: v }))}
          placeholder="10:00-22:00"
        />
        <Field
          label="纬度"
          value={form.latitude != null ? String(form.latitude) : ''}
          onChange={(v) => setForm((s) => ({ ...s, latitude: v ? Number(v) : null }))}
          placeholder="31.2304"
        />
        <Field
          label="经度"
          value={form.longitude != null ? String(form.longitude) : ''}
          onChange={(v) => setForm((s) => ({ ...s, longitude: v ? Number(v) : null }))}
          placeholder="121.4737"
        />
        <div className="md:col-span-2">
          <Field
            label="简介"
            value={form.description || ''}
            onChange={(v) => setForm((s) => ({ ...s, description: v }))}
            textarea
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="text-xs text-zinc-500">{merchant ? `商家ID：${merchant.id}` : '尚未创建商家'}</div>
        <button
          disabled={!canEdit || saving}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:bg-orange-300"
          onClick={onSave}
        >
          保存
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  textarea?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className="mt-1 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        />
      )}
    </div>
  )
}
