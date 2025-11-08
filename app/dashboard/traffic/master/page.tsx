'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Domain {
  id: string
  domain: string
  db_schema: string
  status: string
  total_visits: number
  total_bots_blocked: number
  total_spam_blocked: number
  unique_visitors_today: number
  bots_blocked_today: number
  spam_blocked_today: number
  last_traffic_at: string
  created_at: string
  traffic_settings: any
}

interface MasterDashboardData {
  overview: {
    total_domains: number
    total_visits: number
    unique_visitors_today: number
    total_bots_detected: number
  }
  hourly_traffic: Array<{ hour: number; visits: number }>
  top_domains: Array<{ domain: string; visits: number; visitors_today: number }>
  top_ips: Array<{ ip: string; visits: number }>
  recent_activity: Array<{
    domain: string
    ip: string
    path: string
    user_agent: string
    timestamp: string
  }>
}

export default function MasterTrafficControl() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [migrationApplied, setMigrationApplied] = useState(false)
  const [applyingMigration, setApplyingMigration] = useState(false)
  const router = useRouter()
  
  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])
  
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Check migration status
  const checkMigration = async () => {
    try {
      // Try simplified migration check first
      const response = await fetch('/api/system/migration-simple', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()
      console.log('Migration check response:', data)
      const isApplied = data.migrationApplied === true
      setMigrationApplied(isApplied)
      return isApplied
    } catch (error) {
      console.error('Error checking migration:', error)
      // Try alternative check
      try {
        const altResponse = await fetch('/api/system/migration')
        const altData = await altResponse.json()
        const isApplied = altData.migrationApplied === true
        setMigrationApplied(isApplied)
        return isApplied
      } catch (altError) {
        console.error('Alternative check also failed:', altError)
        return false
      }
    }
  }

  // Apply migration
  const applyMigration = async () => {
    setApplyingMigration(true)
    setError('')
    try {
      // Use simplified migration
      const response = await fetch('/api/system/migration-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      console.log('Migration apply response:', data)
      
      if (data.success) {
        setSuccess('Multi-domain desteği başarıyla kuruldu!')
        setMigrationApplied(true)
        localStorage.setItem('multiDomainMigrationApplied', 'true')
        // Wait a bit then fetch domains
        setTimeout(() => {
          setLoading(true)
          fetchDomains()
        }, 1500)
      } else {
        setError(data.error || 'Migration uygulanırken hata oluştu')
      }
    } catch (error) {
      console.error('Error applying migration:', error)
      setError('Migration uygulanırken hata oluştu')
    } finally {
      setApplyingMigration(false)
    }
  }

  // Fetch all domains
  const fetchDomains = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/traffic/domains')
      const data = await response.json()
      
      if (data.success) {
        setDomains(data.domains || [])
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
      setError('Domain listesi yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      // Check localStorage first for quick response
      const localMigrationStatus = localStorage.getItem('multiDomainMigrationApplied')
      if (localMigrationStatus === 'true') {
        setMigrationApplied(true)
        fetchDomains()
      }
      
      // Then verify with server
      const migrationStatus = await checkMigration()
      if (migrationStatus) {
        localStorage.setItem('multiDomainMigrationApplied', 'true')
        if (localMigrationStatus !== 'true') {
          fetchDomains()
        }
      } else {
        localStorage.removeItem('multiDomainMigrationApplied')
        setLoading(false)
      }
    }
    init()
  }, [])

  // Add new domain
  const handleAddDomain = async () => {
    if (!newDomain) {
      setError('Lütfen bir domain girin')
      return
    }

    try {
      const response = await fetch('/api/traffic/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`${newDomain} başarıyla eklendi`)
        setNewDomain('')
        setShowAddModal(false)
        fetchDomains()
      } else {
        setError(data.error || 'Domain eklenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error adding domain:', error)
      setError('Domain eklenirken hata oluştu')
    }
  }

  // Delete domain
  const handleDeleteDomain = async (domain: string) => {
    if (!confirm(`${domain} ve tüm verilerini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/traffic/domains?domain=${domain}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`${domain} başarıyla silindi`)
        fetchDomains()
      } else {
        setError(data.error || 'Domain silinirken hata oluştu')
      }
    } catch (error) {
      console.error('Error deleting domain:', error)
      setError('Domain silinirken hata oluştu')
    }
  }

  // Calculate totals
  const totals = domains.reduce((acc, domain) => ({
    visits: acc.visits + (domain.total_visits || 0),
    bots: acc.bots + (domain.total_bots_blocked || 0),
    spam: acc.spam + (domain.total_spam_blocked || 0),
    todayVisitors: acc.todayVisitors + (domain.unique_visitors_today || 0),
    todayBots: acc.todayBots + (domain.bots_blocked_today || 0),
    todaySpam: acc.todaySpam + (domain.spam_blocked_today || 0)
  }), { visits: 0, bots: 0, spam: 0, todayVisitors: 0, todayBots: 0, todaySpam: 0 })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Show migration setup screen if not applied
  if (!migrationApplied) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Multi-Domain Kurulumu
            </h2>
            <p className="text-gray-600 mb-6">
              Multi-domain traffic control sistemini kullanmak için tek seferlik kurulum yapılmalıdır.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Kurulum ile:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Her domain için ayrı veritabanı tabloları</li>
                <li>✓ Domain bazlı traffic izleme</li>
                <li>✓ Bağımsız bot/spam koruması</li>
                <li>✓ Domain özel kurallar ve ayarlar</li>
                <li>✓ Merkezi yönetim paneli</li>
              </ul>
            </div>
            
            <button
              onClick={() => {
                console.log('Migration button clicked')
                applyMigration()
              }}
              disabled={applyingMigration}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                applyingMigration
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {applyingMigration ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Kuruluyor...
                </span>
              ) : (
                'Kurulumu Başlat'
              )}
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎛️ Master Traffic Control</h1>
            <p className="text-sm text-gray-600 mt-1">Tüm domainlerin merkezi yönetimi ve monitörü</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Yeni Domain Ekle
          </button>
        </div>
      </div>

      {/* Feature Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Her Domain İçin Ayrı Yönetim Sistemleri
            </p>
            <p className="text-xs text-blue-700">
              Her domain'e tıkladığınızda şu özelliklere erişebilirsiniz:
              <span className="font-medium"> Analytics • IP Management • Auto Rules • Bot Detection • Spam Control • Rate Limiting • GeoIP</span>
            </p>
          </div>
        </div>
      </div>

      {/* Total Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Toplam Domain</p>
          <p className="text-2xl font-bold text-gray-900">{domains.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Toplam Ziyaret</p>
          <p className="text-2xl font-bold text-gray-900">{totals.visits.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Engellenen Bot</p>
          <p className="text-2xl font-bold text-red-600">{totals.bots.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Bugün Ziyaretçi</p>
          <p className="text-2xl font-bold text-blue-600">{totals.todayVisitors}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Bugün Bot</p>
          <p className="text-2xl font-bold text-orange-600">{totals.todayBots}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Bugün Spam</p>
          <p className="text-2xl font-bold text-purple-600">{totals.todaySpam}</p>
        </div>
      </div>



      {/* Domains List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bugün (Ziyaret/Bot/Spam)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Ziyaret
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Son Trafik
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Henüz domain eklenmemiş. Yeni domain ekleyerek başlayın.
                  </td>
                </tr>
              ) : (
                domains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🌐</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {domain.domain}
                          </div>
                          <div className="text-xs text-gray-500">
                            {domain.total_visits || 0} ziyaret
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        domain.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {domain.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="text-blue-600">{domain.unique_visitors_today || 0}</span> / 
                      <span className="text-orange-600 mx-1">{domain.bots_blocked_today || 0}</span> / 
                      <span className="text-purple-600">{domain.spam_blocked_today || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {domain.total_visits?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {domain.last_traffic_at 
                        ? new Date(domain.last_traffic_at).toLocaleString('tr-TR')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/traffic/domain/${domain.domain}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3 inline-flex items-center gap-1"
                        title="Analytics, IP Management, Bot Detection, Spam Control, Rate Limiting, GeoIP"
                      >
                        <span>Yönet</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDeleteDomain(domain.domain)}
                        className="text-red-600 hover:text-red-900"
                        title="Domain'i Sil"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Yeni Domain Ekle</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain Adı
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="ornek.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Domain için otomatik olarak ayrı tablolar ve traffic control oluşturulacak
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewDomain('')
                  setError('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={handleAddDomain}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Domain Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
          {success}
        </div>
      )}
    </div>
  )
}