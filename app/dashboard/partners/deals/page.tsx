'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Deal {
  id: number
  buyer_code: string
  buyer_name: string
  offer_id: string
  offer_name: string
  deal_type: 'CPA' | 'CPL' | 'CPS' | 'HYBRID' | 'REVSHARE'
  fixed_amount: number | null
  percentage: number | null
  lead_commission: number | null
  sale_commission: number | null
  currency: string
  contract_start_date: string | null
  contract_end_date: string | null
  auto_renew: boolean
  status: 'active' | 'inactive' | 'expired'
  created_at: string
}

interface Partner {
  buyer_code: string
  buyer_name: string
}

interface Offer {
  offer_id: string
  offer_name: string
  product_type: string
  base_price: number
}

function DealsPageContent() {
  const searchParams = useSearchParams()
  const initialBuyer = searchParams.get('buyer')

  const [deals, setDeals] = useState<Deal[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Filters
  const [filterBuyer, setFilterBuyer] = useState(initialBuyer || '')
  const [filterOffer, setFilterOffer] = useState('')
  const [filterDealType, setFilterDealType] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [dealsRes, partnersRes, offersRes] = await Promise.all([
        fetch('/api/partners/deals'),
        fetch('/api/partners?status=active'),
        fetch('/api/offers')
      ])

      if (dealsRes.ok) {
        const dealsData = await dealsRes.json()
        setDeals(dealsData.deals || [])
      }

      if (partnersRes.ok) {
        const partnersData = await partnersRes.json()
        setPartners(partnersData.partners || [])
      }

      if (offersRes.ok) {
        const offersData = await offersRes.json()
        setOffers(offersData.offers || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDeals = deals.filter(deal => {
    if (filterBuyer && deal.buyer_code !== filterBuyer) return false
    if (filterOffer && deal.offer_id !== filterOffer) return false
    if (filterDealType && deal.deal_type !== filterDealType) return false
    if (filterStatus !== 'all' && deal.status !== filterStatus) return false
    return true
  })

  const stats = {
    total: deals.length,
    active: deals.filter(d => d.status === 'active').length,
    inactive: deals.filter(d => d.status === 'inactive').length,
    expired: deals.filter(d => d.status === 'expired').length,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partner Anlaşmaları</h1>
            <p className="text-gray-600 mt-1">
              Partner'lar ile ürünler arasındaki komisyon anlaşmalarını yönetin
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
          >
            <span>➕</span>
            <span>Yeni Anlaşma Oluştur</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard title="Toplam Anlaşma" value={stats.total} icon="📝" color="blue" />
        <StatCard title="Aktif" value={stats.active} icon="✅" color="green" />
        <StatCard title="Pasif" value={stats.inactive} icon="⭕" color="gray" />
        <StatCard title="Süresi Dolmuş" value={stats.expired} icon="⏰" color="red" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner</label>
            <select
              value={filterBuyer}
              onChange={(e) => setFilterBuyer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              {partners.map(p => (
                <option key={p.buyer_code} value={p.buyer_code}>
                  {p.buyer_name} ({p.buyer_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün</label>
            <select
              value={filterOffer}
              onChange={(e) => setFilterOffer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              {offers.map(o => (
                <option key={o.offer_id} value={o.offer_id}>
                  {o.offer_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Tipi</label>
            <select
              value={filterDealType}
              onChange={(e) => setFilterDealType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              <option value="CPA">CPA</option>
              <option value="CPL">CPL</option>
              <option value="CPS">CPS</option>
              <option value="HYBRID">HYBRID</option>
              <option value="REVSHARE">REVSHARE</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="expired">Süresi Dolmuş</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deals List */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Anlaşmalar yükleniyor...</div>
      ) : filteredDeals.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Anlaşma Bulunamadı
          </h3>
          <p className="text-gray-600 mb-4">
            Filtre kriterlerinize uygun anlaşma bulunamadı veya henüz anlaşma oluşturulmadı.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <span>➕</span>
            <span>İlk Anlaşmayı Oluştur</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Partner</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Ürün</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700">Deal Tipi</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">Komisyon</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700">Süre</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700">Durum</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => (
                <tr key={deal.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{deal.buyer_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{deal.buyer_code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{deal.offer_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{deal.offer_id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <DealTypeBadge type={deal.deal_type} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <CommissionDisplay deal={deal} />
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    {deal.contract_start_date && deal.contract_end_date ? (
                      <div>
                        <p className="text-gray-900">
                          {new Date(deal.contract_start_date).toLocaleDateString('tr-TR')}
                        </p>
                        <p className="text-gray-600 text-xs">
                          → {new Date(deal.contract_end_date).toLocaleDateString('tr-TR')}
                        </p>
                        {deal.auto_renew && (
                          <p className="text-xs text-green-600 mt-1">🔄 Otomatik yenileme</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Süresiz</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={deal.status} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Deal Modal */}
      {showCreateModal && (
        <CreateDealModal
          partners={partners}
          offers={offers}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className={`bg-white border-l-4 border-${color}-500 p-4 rounded-lg shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-xs mb-1">{title}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </div>
  )
}

function DealTypeBadge({ type }: { type: string }) {
  const colors: any = {
    CPA: 'bg-blue-100 text-blue-800',
    CPL: 'bg-green-100 text-green-800',
    CPS: 'bg-purple-100 text-purple-800',
    HYBRID: 'bg-orange-100 text-orange-800',
    REVSHARE: 'bg-pink-100 text-pink-800',
  }

  const descriptions: any = {
    CPA: 'Satış Başına',
    CPL: 'Lead Başına',
    CPS: 'Satış %',
    HYBRID: 'Karma',
    REVSHARE: 'Gelir Paylaşımı',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[type]}`} title={descriptions[type]}>
      {type}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    expired: 'bg-red-100 text-red-800',
  }

  const icons: any = {
    active: '✅',
    inactive: '⭕',
    expired: '⏰',
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {icons[status]} {status.toUpperCase()}
    </span>
  )
}

function CommissionDisplay({ deal }: { deal: Deal }) {
  const { deal_type, fixed_amount, percentage, lead_commission, sale_commission, currency } = deal

  if (deal_type === 'CPA' && fixed_amount) {
    return (
      <div className="font-semibold text-blue-600">
        {currency}{(Number(fixed_amount) || 0).toFixed(2)} /satış
      </div>
    )
  }

  if (deal_type === 'CPL' && fixed_amount) {
    return (
      <div className="font-semibold text-green-600">
        {currency}{(Number(fixed_amount) || 0).toFixed(2)} /lead
      </div>
    )
  }

  if (deal_type === 'CPS' && percentage) {
    return (
      <div className="font-semibold text-purple-600">
        %{(Number(percentage) || 0).toFixed(2)}
      </div>
    )
  }

  if (deal_type === 'HYBRID' && lead_commission && sale_commission) {
    return (
      <div className="text-sm">
        <div className="text-green-600">{currency}{(Number(lead_commission) || 0).toFixed(2)} /lead</div>
        <div className="text-blue-600">{currency}{(Number(sale_commission) || 0).toFixed(2)} /satış</div>
      </div>
    )
  }

  if (deal_type === 'REVSHARE' && percentage) {
    return (
      <div className="font-semibold text-pink-600">
        %{(Number(percentage) || 0).toFixed(2)} /ay
      </div>
    )
  }

  return <span className="text-gray-400">-</span>
}

function CreateDealModal({ partners, offers, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    buyer_code: '',
    offer_id: '',
    deal_type: 'CPA',
    fixed_amount: '',
    percentage: '',
    lead_commission: '',
    sale_commission: '',
    currency: 'EUR',
    contract_start_date: '',
    contract_end_date: '',
    auto_renew: false,
    status: 'active'
  })

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.buyer_code || !formData.offer_id) {
      setError('Partner ve ürün seçimi zorunludur')
      return
    }

    // Validate commission fields based on deal type
    if (formData.deal_type === 'CPA' || formData.deal_type === 'CPL') {
      if (!formData.fixed_amount) {
        setError('Sabit miktar zorunludur')
        return
      }
    }

    if (formData.deal_type === 'CPS' || formData.deal_type === 'REVSHARE') {
      if (!formData.percentage) {
        setError('Yüzde oranı zorunludur')
        return
      }
    }

    if (formData.deal_type === 'HYBRID') {
      if (!formData.lead_commission || !formData.sale_commission) {
        setError('Lead ve satış komisyonları zorunludur')
        return
      }
    }

    setSaving(true)

    try {
      const response = await fetch('/api/partners/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onSuccess()
      } else {
        setError(data.error || 'Anlaşma oluşturulamadı')
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Yeni Anlaşma Oluştur</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Partner & Offer Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner *
                </label>
                <select
                  value={formData.buyer_code}
                  onChange={(e) => setFormData({ ...formData, buyer_code: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {partners.map((p: Partner) => (
                    <option key={p.buyer_code} value={p.buyer_code}>
                      {p.buyer_name} ({p.buyer_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ürün *
                </label>
                <select
                  value={formData.offer_id}
                  onChange={(e) => setFormData({ ...formData, offer_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {offers.map((o: Offer) => (
                    <option key={o.offer_id} value={o.offer_id}>
                      {o.offer_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Deal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Tipi *
              </label>
              <select
                value={formData.deal_type}
                onChange={(e) => setFormData({ ...formData, deal_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CPA">CPA - Satış başına sabit komisyon</option>
                <option value="CPL">CPL - Lead başına sabit komisyon</option>
                <option value="CPS">CPS - Satış tutarının yüzdesi</option>
                <option value="HYBRID">HYBRID - Lead + Satış karma</option>
                <option value="REVSHARE">REVSHARE - Aylık gelir paylaşımı</option>
              </select>
            </div>

            {/* Commission Fields - Dynamic based on deal type */}
            {(formData.deal_type === 'CPA' || formData.deal_type === 'CPL') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sabit Miktar *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fixed_amount}
                    onChange={(e) => setFormData({ ...formData, fixed_amount: e.target.value })}
                    placeholder="50.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Para Birimi
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>
              </div>
            )}

            {(formData.deal_type === 'CPS' || formData.deal_type === 'REVSHARE') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yüzde Oranı (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  placeholder="15.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {formData.deal_type === 'HYBRID' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Komisyonu *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.lead_commission}
                    onChange={(e) => setFormData({ ...formData, lead_commission: e.target.value })}
                    placeholder="3.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Satış Komisyonu *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sale_commission}
                    onChange={(e) => setFormData({ ...formData, sale_commission: e.target.value })}
                    placeholder="30.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Para Birimi
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>
              </div>
            )}

            {/* Contract Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Auto Renew & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.auto_renew}
                  onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label className="text-sm text-gray-700">
                  Otomatik Yenileme
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durum
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Anlaşma Oluştur'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function DealsPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="text-center py-12 text-gray-600">Anlaşmalar yükleniyor...</div>
      </div>
    }>
      <DealsPageContent />
    </Suspense>
  )
}
