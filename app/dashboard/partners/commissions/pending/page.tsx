'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Commission {
  id: number
  buyer_code: string
  buyer_name: string
  tracking_id: string
  offer_name: string
  commission_type: string
  commission_amount: number
  currency: string
  created_at: string
}

export default function PendingCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    fetchPending()
  }, [])

  const fetchPending = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/partners/commissions?status=pending')
      if (response.ok) {
        const data = await response.json()
        setCommissions(data.commissions || [])
      }
    } catch (error) {
      console.error('Failed to fetch pending commissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = commissions.reduce((sum, c) => sum + c.commission_amount, 0)
  const selectedAmount = commissions
    .filter(c => selectedIds.includes(c.id))
    .reduce((sum, c) => sum + c.commission_amount, 0)

  const handleSelectAll = () => {
    if (selectedIds.length === commissions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(commissions.map(c => c.id))
    }
  }

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleApproveSelected = async () => {
    if (selectedIds.length === 0) return

    if (!confirm(`${selectedIds.length} komisyonu onaylamak istediğinizden emin misiniz?`)) {
      return
    }

    setApproving(true)
    try {
      const response = await fetch('/api/partners/commissions/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_ids: selectedIds })
      })

      if (response.ok) {
        alert('Komisyonlar başarıyla onaylandı')
        setSelectedIds([])
        fetchPending()
      } else {
        alert('Komisyon onaylama başarısız')
      }
    } catch (error) {
      alert('Bir hata oluştu')
    } finally {
      setApproving(false)
    }
  }

  const handleRejectSelected = async () => {
    if (selectedIds.length === 0) return

    const reason = prompt('Reddetme sebebini giriniz:')
    if (!reason) return

    setRejecting(true)
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
        fetchPending()
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/partners/commissions"
          className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
        >
          ← Komisyon Takibine Dön
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Onay Bekleyen Komisyonlar</h1>
        <p className="text-gray-600 mt-1">
          Onayınızı bekleyen {commissions.length} komisyon
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg shadow">
          <p className="text-yellow-800 text-sm mb-2">Toplam Bekleyen</p>
          <p className="text-3xl font-bold text-yellow-900">{commissions.length}</p>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg shadow">
          <p className="text-yellow-800 text-sm mb-2">Toplam Tutar</p>
          <p className="text-3xl font-bold text-yellow-900">€{totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-lg shadow">
          <p className="text-indigo-800 text-sm mb-2">Seçili Tutar</p>
          <p className="text-3xl font-bold text-indigo-900">€{selectedAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-indigo-900 font-medium">
              {selectedIds.length} komisyon seçildi (€{selectedAmount.toFixed(2)})
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleApproveSelected}
                disabled={approving}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {approving ? 'Onaylanıyor...' : '✅ Seçilenleri Onayla'}
              </button>
              <button
                onClick={handleRejectSelected}
                disabled={rejecting}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {rejecting ? 'Reddediliyor...' : '❌ Seçilenleri Reddet'}
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending List */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
      ) : commissions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Bekleyen Komisyon Yok
          </h3>
          <p className="text-gray-600">
            Şu anda onay bekleyen komisyon bulunmuyor.
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
                    checked={selectedIds.length === commissions.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tracking ID</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Partner</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Ürün</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Tip</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Tutar</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((comm) => (
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
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                      {comm.commission_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {comm.currency}{comm.commission_amount.toFixed(2)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {new Date(comm.created_at).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
