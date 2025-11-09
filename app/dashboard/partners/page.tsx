'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Partner {
  id: number
  buyer_code: string
  buyer_name: string
  company_name: string
  email: string
  phone: string
  status: 'active' | 'inactive' | 'suspended'
  portal_active: boolean
  total_leads: number
  pending_commission: number
  created_at: string
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPartners()
  }, [])

  const fetchPartners = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/partners')
      if (response.ok) {
        const data = await response.json()
        setPartners(data.partners || [])
      }
    } catch (error) {
      console.error('Failed to fetch partners:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPartners = partners.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter
    const matchesSearch = 
      p.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.buyer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: partners.length,
    active: partners.filter(p => p.status === 'active').length,
    inactive: partners.filter(p => p.status === 'inactive').length,
    totalLeads: partners.reduce((sum, p) => sum + (p.total_leads || 0), 0),
    totalCommission: partners.reduce((sum, p) => sum + (p.pending_commission || 0), 0),
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partner Yönetimi</h1>
            <p className="text-gray-600 mt-1">
              Tüm partner'ları görüntüle ve yönet
            </p>
          </div>
          <Link
            href="/dashboard/partners/new"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
          >
            <span>➕</span>
            <span>Yeni Partner Ekle</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <StatCard
          title="Toplam Partner"
          value={stats.total}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Aktif"
          value={stats.active}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Pasif"
          value={stats.inactive}
          icon="⭕"
          color="gray"
        />
        <StatCard
          title="Toplam Lead"
          value={stats.totalLeads}
          icon="📊"
          color="purple"
        />
        <StatCard
          title="Bekleyen Komisyon"
          value={`€${stats.totalCommission.toFixed(2)}`}
          icon="💰"
          color="yellow"
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tümü ({stats.total})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                filter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Aktif ({stats.active})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                filter === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pasif ({stats.inactive})
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Partner ara (isim, kod, şirket)..."
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Partners List */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Partner'lar yükleniyor...</div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Partner Bulunamadı' : 'Henüz Partner Yok'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Arama kriterlerine uygun partner bulunamadı.'
              : 'Yeni bir partner ekleyerek başlayın.'
            }
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/partners/new"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <span>➕</span>
              <span>İlk Partner'ı Ekle</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
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
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </div>
  )
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <Link href={`/dashboard/partners/${partner.id}`}>
      <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-indigo-500">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {partner.buyer_name}
            </h3>
            <p className="text-sm text-gray-600">{partner.company_name}</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">{partner.buyer_code}</p>
          </div>
          <div className="flex flex-col gap-1">
            <StatusBadge status={partner.status} />
            {partner.portal_active && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                🔑 Portal Aktif
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-xs text-gray-600 mb-1">Toplam Lead</div>
            <div className="text-lg font-bold text-gray-900">{partner.total_leads || 0}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-xs text-gray-600 mb-1">Bekleyen Komisyon</div>
            <div className="text-lg font-bold text-yellow-600">
              €{(partner.pending_commission || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <span>📧</span>
            <span className="truncate">{partner.email}</span>
          </div>
          {partner.phone && (
            <div className="flex items-center gap-2">
              <span>📱</span>
              <span>{partner.phone}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
          Oluşturulma: {new Date(partner.created_at).toLocaleDateString('tr-TR')}
        </div>
      </div>
    </Link>
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
