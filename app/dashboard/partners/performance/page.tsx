'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PartnerPerformance {
  buyer_code: string
  buyer_name: string
  total_leads: number
  approved_leads: number
  rejected_leads: number
  conversion_rate: number
  total_commission: number
  pending_commission: number
  approved_commission: number
  paid_commission: number
  avg_commission: number
  active_deals: number
  last_lead_date: string | null
}

function PerformancePageContent() {
  const searchParams = useSearchParams()
  const initialBuyer = searchParams.get('buyer')

  const [performances, setPerformances] = useState<PartnerPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBuyer, setSelectedBuyer] = useState(initialBuyer || '')
  const [sortBy, setSortBy] = useState<'leads' | 'commission' | 'conversion'>('commission')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchPerformance()
  }, [])

  const fetchPerformance = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/partners/performance')
      if (response.ok) {
        const data = await response.json()
        setPerformances(data.performances || [])
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort
  let filteredPerformances = selectedBuyer
    ? performances.filter(p => p.buyer_code === selectedBuyer)
    : performances

  // Sort
  filteredPerformances = [...filteredPerformances].sort((a, b) => {
    let aVal: number, bVal: number

    switch (sortBy) {
      case 'leads':
        aVal = a.total_leads
        bVal = b.total_leads
        break
      case 'commission':
        aVal = a.total_commission
        bVal = b.total_commission
        break
      case 'conversion':
        aVal = a.conversion_rate
        bVal = b.conversion_rate
        break
      default:
        return 0
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
  })

  // Overall stats
  const totalStats = {
    partners: performances.length,
    totalLeads: performances.reduce((sum, p) => sum + p.total_leads, 0),
    totalCommission: performances.reduce((sum, p) => sum + p.total_commission, 0),
    avgConversion: performances.length > 0
      ? performances.reduce((sum, p) => sum + p.conversion_rate, 0) / performances.length
      : 0,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Partner Performans Raporu</h1>
        <p className="text-gray-600 mt-1">
          Tüm partner'ların detaylı performans analizi
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 text-sm mb-1">Toplam Partner</p>
              <p className="text-3xl font-bold text-blue-900">{totalStats.partners}</p>
            </div>
            <div className="text-4xl opacity-80">👥</div>
          </div>
        </div>

        <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-800 text-sm mb-1">Toplam Lead</p>
              <p className="text-3xl font-bold text-purple-900">{totalStats.totalLeads}</p>
            </div>
            <div className="text-4xl opacity-80">📊</div>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 text-sm mb-1">Toplam Komisyon</p>
              <p className="text-3xl font-bold text-green-900">€{totalStats.totalCommission.toFixed(2)}</p>
            </div>
            <div className="text-4xl opacity-80">💰</div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm mb-1">Ort. Conversion</p>
              <p className="text-3xl font-bold text-yellow-900">{totalStats.avgConversion.toFixed(1)}%</p>
            </div>
            <div className="text-4xl opacity-80">📈</div>
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner Filtrele</label>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              {performances.map(p => (
                <option key={p.buyer_code} value={p.buyer_code}>
                  {p.buyer_name} ({p.buyer_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama Kriteri</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="commission">Komisyon</option>
              <option value="leads">Lead Sayısı</option>
              <option value="conversion">Conversion Oranı</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama Yönü</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="desc">Yüksekten Düşüğe</option>
              <option value="asc">Düşükten Yükseğe</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Performans verileri yükleniyor...</div>
      ) : filteredPerformances.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Performans Verisi Yok
          </h3>
          <p className="text-gray-600">
            Henüz performans verisi bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPerformances.map((perf) => (
            <div key={perf.buyer_code} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{perf.buyer_name}</h3>
                    <p className="text-sm opacity-90 font-mono">{perf.buyer_code}</p>
                  </div>
                  <Link
                    href={`/dashboard/partners/${perf.buyer_code}`}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Detay →
                  </Link>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-6 space-y-4">
                {/* Lead Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-3 font-semibold uppercase">Lead İstatistikleri</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Toplam</p>
                      <p className="text-2xl font-bold text-gray-900">{perf.total_leads}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Onaylı</p>
                      <p className="text-2xl font-bold text-green-600">{perf.approved_leads}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Reddedilen</p>
                      <p className="text-2xl font-bold text-red-600">{perf.rejected_leads}</p>
                    </div>
                  </div>
                </div>

                {/* Commission Stats */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                  <p className="text-xs text-green-800 mb-3 font-semibold uppercase">Komisyon Dağılımı</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-green-700">Bekleyen</p>
                      <p className="text-lg font-bold text-yellow-600">€{perf.pending_commission.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Onaylı</p>
                      <p className="text-lg font-bold text-green-600">€{perf.approved_commission.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Ödenen</p>
                      <p className="text-lg font-bold text-blue-600">€{perf.paid_commission.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Toplam</p>
                      <p className="text-lg font-bold text-gray-900">€{perf.total_commission.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700 mb-1">Conversion</p>
                    <p className="text-xl font-bold text-blue-900">{perf.conversion_rate.toFixed(1)}%</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700 mb-1">Ort. Komisyon</p>
                    <p className="text-xl font-bold text-purple-900">€{perf.avg_commission.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-700 mb-1">Aktif Deal</p>
                    <p className="text-xl font-bold text-indigo-900">{perf.active_deals}</p>
                  </div>
                </div>

                {/* Last Activity */}
                {perf.last_lead_date && (
                  <div className="text-center pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      Son Lead: {new Date(perf.last_lead_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PerformancePage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="text-center py-12 text-gray-600">Performans verileri yükleniyor...</div>
      </div>
    }>
      <PerformancePageContent />
    </Suspense>
  )
}
