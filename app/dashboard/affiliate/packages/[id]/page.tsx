'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface BatchItem {
  id: number
  tracking_id: string
  buyer_code: string
  offer_id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_address: string
  customer_country: string
  status: string
  processed_at: string | null
  rejection_reason: string | null
  crm_lead_id: string | null
  crm_sync_status: string | null
  crm_sync_at: string | null
  added_at: string
}

interface Batch {
  id: number
  batch_id: string
  batch_name: string
  buyer_code: string
  buyer_name: string
  company_name: string
  offer_id: string
  offer_name: string
  base_price: number
  lead_count: number
  approved_count: number
  rejected_count: number
  status: string
  created_by: string
  sent_by: string | null
  completed_by: string | null
  created_at: string
  sent_at: string | null
  completed_at: string | null
  export_format: string
  export_path: string | null
  export_url: string | null
  crm_batch_id: string | null
  crm_status: string | null
  crm_response: string | null
  notes: string | null
  metadata: any
}

export default function PackageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const batch_id = params.id as string

  const [batch, setBatch] = useState<Batch | null>(null)
  const [items, setItems] = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchBatch()
  }, [batch_id])

  const fetchBatch = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/packages/${batch_id}`)
      if (response.ok) {
        const data = await response.json()
        setBatch(data.batch)
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch batch:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!confirm(`Paket durumunu "${newStatus}" olarak değiştirmek istediğinizden emin misiniz?`)) {
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/packages/${batch_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          sent_by: newStatus === 'sent' ? 'admin' : undefined,
          completed_by: newStatus === 'completed' ? 'admin' : undefined
        })
      })

      if (response.ok) {
        alert('Paket durumu güncellendi')
        fetchBatch()
      } else {
        alert('Güncelleme başarısız')
      }
    } catch (error) {
      alert('Bir hata oluştu')
    } finally {
      setUpdating(false)
    }
  }

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/packages/${batch_id}/export?format=${format}`)
      
      if (format === 'csv' || format === 'json') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${batch_id}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bu paketi silmek istediğinizden emin misiniz? Leadler tekrar "approved_for_crm" durumuna geçecek.')) {
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/packages/${batch_id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Paket silindi')
        router.push('/dashboard/affiliate/packages')
      } else {
        alert('Silme başarısız')
      }
    } catch (error) {
      alert('Bir hata oluştu')
    } finally {
      setUpdating(false)
    }
  }

  if (loading || !batch) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-600">Paket yükleniyor...</div>
      </div>
    )
  }

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    approved: items.filter(i => i.status === 'approved').length,
    rejected: items.filter(i => i.status === 'rejected').length,
    synced: items.filter(i => i.crm_lead_id).length
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/affiliate/packages"
          className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
        >
          ← Paket Listesine Dön
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{batch.batch_name}</h1>
            <p className="text-gray-600 mt-1 font-mono">{batch.batch_id}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleExport('csv')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 CSV Export
            </button>
            <button
              onClick={() => handleExport('json')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              📄 JSON Export
            </button>
            {batch.status === 'draft' && (
              <button
                onClick={handleDelete}
                disabled={updating}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                🗑️ Sil
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Batch Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <InfoCard label="Partner" value={batch.buyer_name} sublabel={batch.company_name} />
        <InfoCard label="Ürün" value={batch.offer_name} sublabel={`€${batch.base_price}`} />
        <InfoCard label="Durum" value={batch.status.toUpperCase()} sublabel={`${batch.lead_count} lead`} />
        <InfoCard label="Oluşturan" value={batch.created_by} sublabel={new Date(batch.created_at).toLocaleDateString('tr-TR')} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <StatCard title="Toplam" value={stats.total} color="blue" />
        <StatCard title="Bekleyen" value={stats.pending} color="yellow" />
        <StatCard title="Onaylı" value={stats.approved} color="green" />
        <StatCard title="Reddedildi" value={stats.rejected} color="red" />
        <StatCard title="CRM'ye Gitti" value={stats.synced} color="purple" />
      </div>

      {/* Status Actions */}
      {batch.status === 'draft' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-yellow-900">📝 Paket Taslak Durumda</p>
              <p className="text-sm text-yellow-800">Paketi hazır duruma getirin</p>
            </div>
            <button
              onClick={() => handleUpdateStatus('ready')}
              disabled={updating}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              ✅ Hazır İşaretle
            </button>
          </div>
        </div>
      )}

      {batch.status === 'ready' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-900">✅ Paket Gönderime Hazır</p>
              <p className="text-sm text-green-800">CRM'ye gönderebilirsiniz</p>
            </div>
            <button
              onClick={() => handleUpdateStatus('sent')}
              disabled={updating}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              🚀 CRM'ye Gönder
            </button>
          </div>
        </div>
      )}

      {batch.status === 'sent' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">🚀 Paket CRM'ye Gönderildi</p>
              <p className="text-sm text-blue-800">İşlem tamamlandığında tamamla butonuna basın</p>
            </div>
            <button
              onClick={() => handleUpdateStatus('completed')}
              disabled={updating}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              ✨ Tamamlandı İşaretle
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Paket İçeriği ({items.length} lead)</h2>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-600">
            Bu pakette henüz lead yok
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tracking ID</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Müşteri</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Telefon</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Ülke</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Durum</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">CRM</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Eklenme</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono text-gray-900">{item.tracking_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{item.customer_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{item.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{item.customer_email || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{item.customer_country || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.crm_lead_id ? (
                      <span className="text-green-600 text-sm">✓</span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {new Date(item.added_at).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sublabel && <p className="text-sm text-gray-600 mt-1">{sublabel}</p>}
    </div>
  )
}

function StatCard({ title, value, color }: any) {
  return (
    <div className={`bg-white border-l-4 border-${color}-500 p-4 rounded-lg shadow`}>
      <p className="text-gray-600 text-xs mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    removed: 'bg-gray-100 text-gray-800'
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}
