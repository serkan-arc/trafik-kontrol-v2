'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Package {
  id: number
  batch_id: string
  batch_name: string
  buyer_code: string
  buyer_name: string
  offer_id: string
  offer_name: string
  lead_count: number
  approved_count: number
  rejected_count: number
  status: 'draft' | 'ready' | 'sent' | 'completed' | 'cancelled'
  created_by: string
  sent_by: string | null
  created_at: string
  sent_at: string | null
  completed_at: string | null
  export_format: string
  export_url: string | null
  crm_batch_id: string | null
  crm_status: string | null
  notes: string | null
}

interface Partner {
  buyer_code: string
  buyer_name: string
}

interface Offer {
  offer_id: string
  offer_name: string
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterBuyer, setFilterBuyer] = useState<string>('')
  const [filterOffer, setFilterOffer] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [filterStatus, filterBuyer, filterOffer, filterDateFrom, filterDateTo])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterBuyer) params.append('buyer_code', filterBuyer)
      if (filterOffer) params.append('offer_id', filterOffer)
      if (filterDateFrom) params.append('from_date', filterDateFrom)
      if (filterDateTo) params.append('to_date', filterDateTo)

      const [packagesRes, partnersRes, offersRes] = await Promise.all([
        fetch(`/api/packages?${params.toString()}`),
        fetch('/api/partners?status=active'),
        fetch('/api/offers?status=active')
      ])

      if (packagesRes.ok) {
        const data = await packagesRes.json()
        setPackages(data.packages || [])
      }

      if (partnersRes.ok) {
        const data = await partnersRes.json()
        setPartners(data.partners || [])
      }

      if (offersRes.ok) {
        const data = await offersRes.json()
        setOffers(data.offers || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: packages.length,
    draft: packages.filter(p => p.status === 'draft').length,
    ready: packages.filter(p => p.status === 'ready').length,
    sent: packages.filter(p => p.status === 'sent').length,
    completed: packages.filter(p => p.status === 'completed').length,
    totalLeads: packages.reduce((sum, p) => sum + (p.lead_count || 0), 0)
  }

  const handleExport = async (batch_id: string, format: string) => {
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
      } else {
        // Excel - open in new tab or download
        const data = await response.json()
        if (data.success) {
          // For now, just download as CSV
          // In production, use a library like xlsx or ExcelJS
          alert('Excel export: Use CSV format for now, or implement XLSX library')
        }
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Paket Yönetimi</h1>
            <p className="text-gray-600 mt-1">
              Onaylı leadleri paketleyip CRM'ye gönderin
            </p>
          </div>
          <Link
            href="/dashboard/affiliate/leads?status=approved_for_crm"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
          >
            <span>📦</span>
            <span>Yeni Paket Oluştur</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <StatCard title="Toplam Paket" value={stats.total} icon="📦" color="blue" />
        <StatCard title="Taslak" value={stats.draft} icon="📝" color="gray" />
        <StatCard title="Hazır" value={stats.ready} icon="✅" color="green" />
        <StatCard title="Gönderildi" value={stats.sent} icon="🚀" color="indigo" />
        <StatCard title="Tamamlandı" value={stats.completed} icon="✨" color="purple" />
        <StatCard title="Toplam Lead" value={stats.totalLeads} icon="👥" color="yellow" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tümü</option>
              <option value="draft">Taslak</option>
              <option value="ready">Hazır</option>
              <option value="sent">Gönderildi</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>

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
                  {p.buyer_name}
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

      {/* Packages List */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Paketler yükleniyor...</div>
      ) : packages.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Henüz Paket Yok
          </h3>
          <p className="text-gray-600 mb-4">
            Onaylı leadlerden paket oluşturmaya başlayın
          </p>
          <Link
            href="/dashboard/affiliate/leads?status=approved_for_crm"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Lead Havuzuna Git
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {packages.map(pkg => (
            <PackageCard 
              key={pkg.id} 
              package={pkg} 
              onExport={handleExport}
              onRefresh={fetchData}
            />
          ))}
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
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </div>
  )
}

function PackageCard({ package: pkg, onExport, onRefresh }: any) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    ready: 'bg-green-100 text-green-800',
    sent: 'bg-blue-100 text-blue-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  const statusIcons: Record<string, string> = {
    draft: '📝',
    ready: '✅',
    sent: '🚀',
    completed: '✨',
    cancelled: '❌'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{pkg.batch_name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[pkg.status]}`}>
              {statusIcons[pkg.status]} {pkg.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-500 font-mono">{pkg.batch_id}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/affiliate/packages/${pkg.batch_id}`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            📋 Detay
          </Link>
          <button
            onClick={() => onExport(pkg.batch_id, 'csv')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            📥 CSV
          </button>
          <button
            onClick={() => onExport(pkg.batch_id, 'json')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            📄 JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <InfoItem label="Partner" value={pkg.buyer_name} />
        <InfoItem label="Ürün" value={pkg.offer_name} />
        <InfoItem label="Lead Sayısı" value={pkg.lead_count} />
        <InfoItem label="Oluşturan" value={pkg.created_by} />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Oluşturulma</p>
          <p className="font-medium text-gray-900">
            {new Date(pkg.created_at).toLocaleString('tr-TR')}
          </p>
        </div>
        {pkg.sent_at && (
          <div>
            <p className="text-gray-600">Gönderim</p>
            <p className="font-medium text-gray-900">
              {new Date(pkg.sent_at).toLocaleString('tr-TR')}
            </p>
          </div>
        )}
        {pkg.completed_at && (
          <div>
            <p className="text-gray-600">Tamamlanma</p>
            <p className="font-medium text-gray-900">
              {new Date(pkg.completed_at).toLocaleString('tr-TR')}
            </p>
          </div>
        )}
      </div>

      {pkg.notes && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{pkg.notes}</p>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '-'}</p>
    </div>
  )
}
