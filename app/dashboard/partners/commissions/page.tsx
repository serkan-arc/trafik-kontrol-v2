'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Commission {
  id: number
  buyer_code: string
  buyer_name: string
  tracking_id: string
  offer_id: string
  offer_name: string
  commission_type: string
  commission_amount: number
  currency: string
  commission_status: 'pending' | 'approved' | 'paid' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  payment_date: string | null
  rejection_reason: string | null
  period_month: number | null
  period_year: number | null
  created_at: string
}

interface Partner {
  buyer_code: string
  buyer_name: string
}

function CommissionsPageContent() {
  const searchParams = useSearchParams()
  const initialBuyer = searchParams.get('buyer')

  const [commissions, setCommissions] = useState<Commission[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Filters
  const [filterBuyer, setFilterBuyer] = useState(initialBuyer || '')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null)

  // Bulk actions
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [commissionsRes, partnersRes] = await Promise.all([
        fetch('/api/partners/commissions'),
        fetch('/api/partners?status=active')
      ])

      if (commissionsRes.ok) {
        const data = await commissionsRes.json()
        setCommissions(data.commissions || [])
      }

      if (partnersRes.ok) {
        const data = await partnersRes.json()
        setPartners(data.partners || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCommissions = commissions.filter(comm => {
    if (filterBuyer && comm.buyer_code !== filterBuyer) return false
    if (filterStatus !== 'all' && comm.commission_status !== filterStatus) return false
    
    if (filterDateFrom) {
      const commDate = new Date(comm.created_at)
      const fromDate = new Date(filterDateFrom)
      if (commDate < fromDate) return false
    }
    
    if (filterDateTo) {
      const commDate = new Date(comm.created_at)
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      if (commDate > toDate) return false
    }
    
    return true
  })

  const stats = {
    total: commissions.length,
    pending: commissions.filter(c => c.commission_status === 'pending').length,
    approved: commissions.filter(c => c.commission_status === 'approved').length,
    paid: commissions.filter(c => c.commission_status === 'paid').length,
    rejected: commissions.filter(c => c.commission_status === 'rejected').length,
    totalAmount: commissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0),
    pendingAmount: commissions
      .filter(c => c.commission_status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0),
    approvedAmount: commissions
      .filter(c => c.commission_status === 'approved')
      .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0),
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCommissions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCommissions.map(c => c.id))
    }
  }

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return

    if (!confirm(`${selectedIds.length} komisyonu onaylamak istediğinizden emin misiniz?`)) {
      return
    }

    setBulkApproving(true)
    try {
      const response = await fetch('/api/partners/commissions/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_ids: selectedIds })
      })

      if (response.ok) {
        alert('Komisyonlar başarıyla onaylandı')
        setSelectedIds([])
        fetchData()
      } else {
        alert('Komisyon onaylama başarısız')
      }
    } catch (error) {
      alert('Bir hata oluştu')
    } finally {
      setBulkApproving(false)
    }
  }

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return

    const reason = prompt('Reddetme sebebini giriniz:')
    if (!reason) return

    setBulkRejecting(true)
    try {
      const response = await fetch('/api/partners/commissions/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          commission_ids: selectedIds,
          rejection_reason: reason
        })
      })

      if (response.ok) {
        alert('Komisyonlar başarıyla reddedildi')
        setSelectedIds([])
        fetchData()
      } else {
        alert('Komisyon reddetme başarısız')
      }
    } catch (error) {
      alert('Bir hata oluştu')
    } finally {
      setBulkRejecting(false)
    }
  }

  const handleViewDetail = (commission: Commission) => {
    setSelectedCommission(commission)
    setShowDetailModal(true)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Komisyon Takibi</h1>
            <p className="text-gray-600 mt-1">
              Tüm partner komisyonlarını görüntüle ve yönet
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/partners/commissions/pending"
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2 font-medium"
            >
              <span>✅</span>
              <span>Onay Bekleyenler</span>
            </Link>
            <Link
              href="/dashboard/partners/commissions/paid"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
            >
              <span>💸</span>
              <span>Ödeme Geçmişi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <StatCard title="Toplam" value={stats.total} icon="📊" color="blue" />
        <StatCard title="Bekleyen" value={stats.pending} icon="⏳" color="yellow" />
        <StatCard title="Onaylı" value={stats.approved} icon="✅" color="green" />
        <StatCard title="Ödendi" value={stats.paid} icon="💸" color="blue" />
        <StatCard title="Reddedilen" value={stats.rejected} icon="❌" color="red" />
        <StatCard 
          title="Toplam Tutar" 
          value={`€${stats.totalAmount.toFixed(2)}`} 
          icon="💰" 
          color="purple" 
        />
      </div>

      {/* Amount Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-xs mb-1">Bekleyen Tutar</p>
              <p className="text-2xl font-bold text-yellow-900">€{stats.pendingAmount.toFixed(2)}</p>
            </div>
            <div className="text-4xl opacity-80">⏳</div>
          </div>
        </div>
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 text-xs mb-1">Onaylı Tutar</p>
              <p className="text-2xl font-bold text-green-900">€{stats.approvedAmount.toFixed(2)}</p>
            </div>
            <div className="text-4xl opacity-80">✅</div>
          </div>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="blue-800 text-xs mb-1">Ödenen Tutar</p>
              <p className="text-2xl font-bold text-blue-900">
                €{(stats.totalAmount - stats.pendingAmount - stats.approvedAmount).toFixed(2)}
              </p>
            </div>
            <div className="text-4xl opacity-80">💸</div>
          </div>
        </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tümü</option>
              <option value="pending">Bekleyen</option>
              <option value="approved">Onaylı</option>
              <option value="paid">Ödendi</option>
              <option value="rejected">Reddedilen</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-indigo-900 font-medium">
              {selectedIds.length} komisyon seçildi
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {bulkApproving ? 'Onaylanıyor...' : '✅ Toplu Onayla'}
              </button>
              <button
                onClick={handleBulkReject}
                disabled={bulkRejecting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkRejecting ? 'Reddediliyor...' : '❌ Toplu Reddet'}
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commissions Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Komisyonlar yükleniyor...</div>
      ) : filteredCommissions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Komisyon Bulunamadı
          </h3>
          <p className="text-gray-600">
            Filtre kriterlerinize uygun komisyon bulunamadı.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredCommissions.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tracking ID</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Partner</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Ürün</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Tip</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Tutar</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Durum</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Tarih</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.map((comm) => (
                <tr key={comm.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(comm.id)}
                      onChange={() => handleSelectOne(comm.id)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono text-gray-900">{comm.tracking_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{comm.buyer_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{comm.buyer_code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{comm.offer_name}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CommissionTypeBadge type={comm.commission_type} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {comm.currency}{(Number(comm.commission_amount) || 0).toFixed(2)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CommissionStatusBadge status={comm.commission_status} />
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {new Date(comm.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewDetail(comm)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      🔍 Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCommission && (
        <CommissionDetailModal
          commission={selectedCommission}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedCommission(null)
          }}
          onUpdate={fetchData}
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
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </div>
  )
}

function CommissionTypeBadge({ type }: { type: string }) {
  const colors: any = {
    CPA: 'bg-blue-100 text-blue-800',
    CPL: 'bg-green-100 text-green-800',
    CPS: 'bg-purple-100 text-purple-800',
    HYBRID: 'bg-orange-100 text-orange-800',
    REVSHARE: 'bg-pink-100 text-pink-800',
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
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

  const icons: any = {
    pending: '⏳',
    approved: '✅',
    paid: '💸',
    rejected: '❌',
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {icons[status]} {status.toUpperCase()}
    </span>
  )
}

function CommissionDetailModal({ commission, onClose, onUpdate }: any) {
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const handleApprove = async () => {
    if (!confirm('Bu komisyonu onaylamak istediğinizden emin misiniz?')) return

    setApproving(true)
    try {
      const response = await fetch(`/api/partners/commissions/${commission.id}/approve`, {
        method: 'POST'
      })

      if (response.ok) {
        alert('Komisyon onaylandı')
        onUpdate()
        onClose()
      } else {
        alert('Komisyon onaylama başarısız')
      }
    } catch (error) {
      alert('Bir hata oluştu')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Reddetme sebebini giriniz:')
    if (!reason) return

    setRejecting(true)
    try {
      const response = await fetch(`/api/partners/commissions/${commission.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason })
      })

      if (response.ok) {
        alert('Komisyon reddedildi')
        onUpdate()
        onClose()
      } else {
        alert('Komisyon reddetme başarısız')
      }
    } catch (error) {
      alert('Bir hata oluştu')
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Komisyon Detayı</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <DetailRow label="Tracking ID" value={commission.tracking_id} />
            <DetailRow label="Partner" value={`${commission.buyer_name} (${commission.buyer_code})`} />
            <DetailRow label="Ürün" value={commission.offer_name} />
            <DetailRow label="Komisyon Tipi" value={<CommissionTypeBadge type={commission.commission_type} />} />
            <DetailRow 
              label="Tutar" 
              value={<span className="font-bold text-lg">{commission.currency}{(Number(commission.commission_amount) || 0).toFixed(2)}</span>} 
            />
            <DetailRow label="Durum" value={<CommissionStatusBadge status={commission.commission_status} />} />
            <DetailRow label="Oluşturulma" value={new Date(commission.created_at).toLocaleString('tr-TR')} />
            
            {commission.approved_by && (
              <>
                <DetailRow label="Onaylayan" value={commission.approved_by} />
                <DetailRow label="Onaylanma Tarihi" value={new Date(commission.approved_at).toLocaleString('tr-TR')} />
              </>
            )}

            {commission.payment_date && (
              <DetailRow label="Ödeme Tarihi" value={new Date(commission.payment_date).toLocaleDateString('tr-TR')} />
            )}

            {commission.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-900 mb-1">Reddetme Sebebi:</p>
                <p className="text-sm text-red-800">{commission.rejection_reason}</p>
              </div>
            )}

            {commission.period_month && commission.period_year && (
              <DetailRow 
                label="Dönem" 
                value={`${commission.period_month}/${commission.period_year}`} 
              />
            )}
          </div>

          {/* Actions */}
          {commission.commission_status === 'pending' && (
            <div className="flex gap-3 justify-end pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {rejecting ? 'Reddediliyor...' : '❌ Reddet'}
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {approving ? 'Onaylanıyor...' : '✅ Onayla'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600 font-medium">{label}:</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}

export default function CommissionsPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="text-center py-12 text-gray-600">Komisyonlar yükleniyor...</div>
      </div>
    }>
      <CommissionsPageContent />
    </Suspense>
  )
}
