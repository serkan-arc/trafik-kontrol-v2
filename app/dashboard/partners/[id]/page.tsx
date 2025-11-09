'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Partner {
  id: number
  buyer_code: string
  buyer_name: string
  company_name: string
  email: string
  phone: string
  contact_person: string
  address: string
  country: string
  notes: string
  status: 'active' | 'inactive' | 'suspended'
  portal_active: boolean
  dashboard_username: string | null
  portal_last_login: string | null
  total_leads: number
  pending_commission: number
  approved_commission: number
  created_at: string
  updated_at: string
}

interface Deal {
  id: number
  offer_id: string
  offer_name: string
  deal_type: string
  fixed_amount: number
  percentage: number
  currency: string
  status: string
}

interface Commission {
  id: number
  tracking_id: string
  commission_type: string
  commission_amount: number
  currency: string
  commission_status: string
  created_at: string
}

export default function PartnerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const partnerId = params.id as string

  const [partner, setPartner] = useState<Partner | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<Partner>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (partnerId) {
      fetchPartnerDetails()
    }
  }, [partnerId])

  const fetchPartnerDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/partners/${partnerId}`)
      if (response.ok) {
        const data = await response.json()
        setPartner(data.partner)
        setDeals(data.deals || [])
        setCommissions(data.recentCommissions || [])
        setFormData(data.partner)
      } else {
        setError('Partner bulunamadı')
      }
    } catch (error) {
      console.error('Failed to fetch partner:', error)
      setError('Partner bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.buyer_name || !formData.email) {
      setError('Partner adı ve email zorunludur')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setPartner({ ...partner!, ...formData })
        setEditMode(false)
      } else {
        setError(data.error || 'Güncellenemedi')
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (response.ok && data.success) {
        router.push('/dashboard/partners')
      } else {
        setError(data.error || 'Silinemedi')
        setShowDeleteModal(false)
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-600">Partner bilgileri yükleniyor...</div>
      </div>
    )
  }

  if (error && !partner) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
        <Link
          href="/dashboard/partners"
          className="inline-block mt-4 text-indigo-600 hover:text-indigo-800"
        >
          ← Partner Listesine Dön
        </Link>
      </div>
    )
  }

  if (!partner) return null

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link
              href="/dashboard/partners"
              className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
            >
              ← Partner Listesine Dön
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{partner.buyer_name}</h1>
            <p className="text-gray-600 mt-1 font-mono">{partner.buyer_code}</p>
          </div>
          <div className="flex gap-3">
            {!editMode ? (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  ✏️ Düzenle
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  🗑️ Sil
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : '✅ Kaydet'}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false)
                    setFormData(partner)
                    setError('')
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  ❌ İptal
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Toplam Lead"
          value={partner.total_leads || 0}
          icon="📊"
          color="blue"
        />
        <StatCard
          title="Bekleyen Komisyon"
          value={`€${(partner.pending_commission || 0).toFixed(2)}`}
          icon="💰"
          color="yellow"
        />
        <StatCard
          title="Onaylı Komisyon"
          value={`€${(partner.approved_commission || 0).toFixed(2)}`}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Aktif Anlaşma"
          value={deals.filter(d => d.status === 'active').length}
          icon="📝"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Partner Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📋 Temel Bilgiler
            </h2>

            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partner Kodu *
                    </label>
                    <input
                      type="text"
                      value={formData.buyer_code || ''}
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Partner kodu değiştirilemez</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partner Adı *
                    </label>
                    <input
                      type="text"
                      value={formData.buyer_name || ''}
                      onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Şirket Adı
                    </label>
                    <input
                      type="text"
                      value={formData.company_name || ''}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durum *
                    </label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Pasif</option>
                      <option value="suspended">Askıya Alınmış</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label="Partner Kodu" value={partner.buyer_code} />
                <InfoRow label="Partner Adı" value={partner.buyer_name} />
                <InfoRow label="Şirket Adı" value={partner.company_name || '-'} />
                <InfoRow
                  label="Durum"
                  value={<StatusBadge status={partner.status} />}
                />
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📞 İletişim Bilgileri
            </h2>

            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İlgili Kişi
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person || ''}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ülke
                    </label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label="Email" value={partner.email} />
                <InfoRow label="Telefon" value={partner.phone || '-'} />
                <InfoRow label="İlgili Kişi" value={partner.contact_person || '-'} />
                <InfoRow label="Ülke" value={partner.country || '-'} />
                <InfoRow label="Adres" value={partner.address || '-'} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📝 Notlar
            </h2>

            {editMode ? (
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Partner hakkında notlar..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {partner.notes || 'Not bulunmuyor'}
              </p>
            )}
          </div>

          {/* Recent Commissions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                💰 Son Komisyonlar
              </h2>
              <Link
                href={`/dashboard/partners/commissions?buyer=${partner.buyer_code}`}
                className="text-indigo-600 hover:text-indigo-800 text-sm"
              >
                Tümünü Gör →
              </Link>
            </div>

            {commissions.length === 0 ? (
              <p className="text-gray-600 text-center py-6">Henüz komisyon kaydı yok</p>
            ) : (
              <div className="space-y-2">
                {commissions.slice(0, 5).map((commission) => (
                  <div
                    key={commission.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-mono text-gray-600">{commission.tracking_id}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(commission.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {commission.currency}{commission.commission_amount.toFixed(2)}
                      </p>
                      <CommissionStatusBadge status={commission.commission_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Portal Access */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🔑 Portal Erişimi
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Durum:</span>
                {partner.portal_active ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Aktif
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    ⭕ Pasif
                  </span>
                )}
              </div>

              {partner.dashboard_username && (
                <InfoRow
                  label="Kullanıcı Adı"
                  value={partner.dashboard_username}
                />
              )}

              {partner.portal_last_login && (
                <InfoRow
                  label="Son Giriş"
                  value={new Date(partner.portal_last_login).toLocaleString('tr-TR')}
                />
              )}

              <Link
                href={`/dashboard/partners/${partner.id}/portal-access`}
                className="block w-full bg-indigo-600 text-white text-center px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors mt-4"
              >
                Portal Erişimini Yönet
              </Link>
            </div>
          </div>

          {/* Active Deals */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                📝 Anlaşmalar
              </h2>
              <Link
                href={`/dashboard/partners/deals?buyer=${partner.buyer_code}`}
                className="text-indigo-600 hover:text-indigo-800 text-sm"
              >
                Yönet →
              </Link>
            </div>

            {deals.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">Anlaşma yok</p>
            ) : (
              <div className="space-y-2">
                {deals.map((deal) => (
                  <div key={deal.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900">{deal.offer_name}</p>
                    <p className="text-xs text-gray-600 mt-1">{deal.deal_type}</p>
                    <p className="text-xs font-mono text-indigo-600 mt-1">
                      {deal.fixed_amount
                        ? `${deal.currency}${deal.fixed_amount}`
                        : `${deal.percentage}%`
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              ℹ️ Kayıt Bilgileri
            </h2>

            <div className="space-y-3 text-sm">
              <InfoRow
                label="Oluşturulma"
                value={new Date(partner.created_at).toLocaleString('tr-TR')}
              />
              <InfoRow
                label="Son Güncelleme"
                value={new Date(partner.updated_at).toLocaleString('tr-TR')}
              />
              <InfoRow
                label="Partner ID"
                value={`#${partner.id}`}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              ⚡ Hızlı İşlemler
            </h2>

            <div className="space-y-2">
              <Link
                href={`/dashboard/partners/deals?buyer=${partner.buyer_code}`}
                className="block w-full bg-blue-50 text-blue-700 text-center px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                💰 Anlaşma Ekle
              </Link>
              <Link
                href={`/dashboard/partners/performance?buyer=${partner.buyer_code}`}
                className="block w-full bg-purple-50 text-purple-700 text-center px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors text-sm"
              >
                📊 Performans Raporu
              </Link>
              <Link
                href={`/dashboard/lead-pool?buyer=${partner.buyer_code}`}
                className="block w-full bg-green-50 text-green-700 text-center px-4 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm"
              >
                📋 Lead'leri Görüntüle
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Partner'ı Sil</h3>
            <p className="text-gray-600 mb-6">
              <strong>{partner.buyer_name}</strong> partner'ını silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz ve tüm ilişkili veriler silinecektir.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600 font-medium">{label}:</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
  }

  const icons: any = {
    active: '✅',
    inactive: '⭕',
    suspended: '🚫',
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {icons[status]} {status.toUpperCase()}
    </span>
  )
}

function CommissionStatusBadge({ status }: { status: string }) {
  const colors: any = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    paid: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {status.toUpperCase()}
    </span>
  )
}
