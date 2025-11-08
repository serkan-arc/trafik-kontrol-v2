'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DomainInfo {
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

interface DomainStats {
  overview: {
    total_ips: number
    new_ips: number
    total_visits: number
    unique_visitors: number
    total_form_submissions: number
    spam_submissions: number
  }
  lists: {
    whitelist: number
    graylist: number
    blacklist: number
    unknown: number
  }
  risk_levels: {
    [key: string]: {
      count: number
      avg_score: number
    }
  }
  bots: {
    verified: number
    fake: number
    types: number
  }
  recent_activity: Array<{
    id: string
    ip: string
    type: string
    message: string
    timestamp: string
  }>
}

export default function DomainTrafficControl({ params }: { params: Promise<{ domain: string }> }) {
  const resolvedParams = use(params)
  const domain = resolvedParams.domain
  const router = useRouter()
  
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null)
  const [stats, setStats] = useState<DomainStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch domain info
  const fetchDomainInfo = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}`)
      const data = await response.json()
      
      if (data.success) {
        setDomainInfo(data.domain)
      } else {
        setError(data.error || 'Domain bulunamadı')
      }
    } catch (error) {
      console.error('Error fetching domain info:', error)
      setError('Domain bilgileri alınamadı')
    }
  }

  // Fetch domain stats
  const fetchDomainStats = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/stats`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching domain stats:', error)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchDomainInfo(), fetchDomainStats()])
      setLoading(false)
    }
    init()
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchDomainStats, 30000)
    return () => clearInterval(interval)
  }, [domain])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/dashboard/traffic/master" 
            className="text-indigo-600 hover:text-indigo-900"
          >
            ← Master Panel'e Dön
          </Link>
        </div>
      </div>
    )
  }

  const spamRate = stats && stats.overview.total_form_submissions > 0
    ? ((stats.overview.spam_submissions / stats.overview.total_form_submissions) * 100).toFixed(1)
    : '0.0'

  const tabs = [
    { id: 'overview', label: 'Genel', icon: '📊' },
    { id: 'analytics', label: 'Analitik', icon: '📈' },
    { id: 'ips', label: 'IP Yönet', icon: '🔍' },
    { id: 'rules', label: 'Kurallar', icon: '⚙️' },
    { id: 'bots', label: 'Botlar', icon: '🤖' },
    { id: 'spam', label: 'Spam', icon: '🚫' },
    { id: 'ratelimit', label: 'Hız Limit', icon: '⏱️' },
    { id: 'geoip', label: 'GeoIP', icon: '🌍' },
    { id: 'settings', label: 'Ayarlar', icon: '🔧' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link 
                href="/dashboard/traffic/master" 
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Master Panel
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>🌐</span>
              <span>{domain}</span>
              {domainInfo?.status === 'active' && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                  aktif
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Traffic kontrol ve yönetim paneli
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Son trafik</p>
            <p className="text-sm font-medium text-gray-900">
              {domainInfo?.last_traffic_at 
                ? new Date(domainInfo.last_traffic_at).toLocaleString('tr-TR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short'
                  })
                : 'Henüz yok'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Toplam Ziyaret</p>
          <p className="text-2xl font-bold text-gray-900">
            {domainInfo?.total_visits?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-green-600 mt-1">
            +{domainInfo?.unique_visitors_today || 0} bugün
          </p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Toplam IP</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats?.overview.total_ips || 0}
          </p>
          <p className="text-xs text-blue-500 mt-1">
            +{stats?.overview.new_ips || 0} yeni
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Engellenen Bot</p>
          <p className="text-2xl font-bold text-red-600">
            {domainInfo?.total_bots_blocked || 0}
          </p>
          <p className="text-xs text-red-500 mt-1">
            +{domainInfo?.bots_blocked_today || 0} bugün
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Spam Engellendi</p>
          <p className="text-2xl font-bold text-orange-600">
            {domainInfo?.total_spam_blocked || 0}
          </p>
          <p className="text-xs text-orange-500 mt-1">
            +{domainInfo?.spam_blocked_today || 0} bugün
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Spam Oranı</p>
          <p className="text-2xl font-bold text-purple-600">
            {spamRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Form gönderimlerinde
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Son Trafik</p>
          <p className="text-sm font-medium text-gray-900">
            {domainInfo?.last_traffic_at 
              ? new Date(domainInfo.last_traffic_at).toLocaleTimeString('tr-TR')
              : '-'
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {domainInfo?.last_traffic_at 
              ? new Date(domainInfo.last_traffic_at).toLocaleDateString('tr-TR')
              : 'Henüz trafik yok'
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* List Distribution */}
              {stats?.lists && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">IP Liste Dağılımı</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-green-900 font-semibold text-2xl">
                        {stats.lists.whitelist}
                      </p>
                      <p className="text-green-700 text-sm">Whitelist</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <p className="text-yellow-900 font-semibold text-2xl">
                        {stats.lists.graylist}
                      </p>
                      <p className="text-yellow-700 text-sm">Graylist</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-red-900 font-semibold text-2xl">
                        {stats.lists.blacklist}
                      </p>
                      <p className="text-red-700 text-sm">Blacklist</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-900 font-semibold text-2xl">
                        {stats.lists.unknown}
                      </p>
                      <p className="text-gray-700 text-sm">Unknown</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Son Aktiviteler</h3>
                <div className="space-y-2">
                  {stats?.recent_activity?.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-gray-600">{activity.ip}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          activity.type === 'bot' ? 'bg-red-100 text-red-700' :
                          activity.type === 'spam' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {activity.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString('tr-TR')}
                      </span>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">Henüz aktivite yok</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ips' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">IP Yönetimi</h3>
                <Link
                  href={`/dashboard/traffic/domain/${domain}/ips`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Detaylı IP Yönetimi →
                </Link>
              </div>
              <p className="text-gray-600">
                Bu domain için {stats?.overview.total_ips || 0} benzersiz IP adresi tespit edildi.
              </p>
            </div>
          )}

          {activeTab === 'bots' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Bot Kontrolü</h3>
                <Link
                  href={`/dashboard/traffic/domain/${domain}/bots`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Detaylı Bot Yönetimi →
                </Link>
              </div>
              {stats?.bots && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-green-900">{stats.bots.verified}</p>
                    <p className="text-sm text-green-700">Doğrulanmış Bot</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-red-900">{stats.bots.fake}</p>
                    <p className="text-sm text-red-700">Sahte Bot</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-blue-900">{stats.bots.types}</p>
                    <p className="text-sm text-blue-700">Bot Türü</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'spam' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Spam Koruması</h3>
                <Link
                  href={`/dashboard/traffic/domain/${domain}/spam`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Detaylı Spam Yönetimi →
                </Link>
              </div>
              <p className="text-gray-600">
                Spam koruma oranı: {spamRate}% - Toplam {stats?.overview.spam_submissions || 0} spam engellendi.
              </p>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Otomatik Kurallar</h3>
                <Link
                  href={`/dashboard/traffic/domain/${domain}/auto-rules`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Kural Yönetimi →
                </Link>
              </div>
              <p className="text-gray-600">
                Bu domain için otomatik traffic kuralları ve akıllı filtreleri yönetin.
              </p>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
                <Link
                  href={`/dashboard/traffic/domain/${domain}/analytics`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Detaylı Analytics →
                </Link>
              </div>
              <p className="text-gray-600">
                {domain} için detaylı trafik analizleri, grafikler ve raporlar.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">Günlük Ortalama</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {Math.round((domainInfo?.total_visits || 0) / 30)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700">Güvenlik Skoru</p>
                  <p className="text-2xl font-bold text-green-900">85/100</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ratelimit' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Rate Limiting</h3>
                <Link
                  href={`/dashboard/traffic/domain/${domain}/rate-limiting`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Rate Limit Ayarları →
                </Link>
              </div>
              <p className="text-gray-600">
                API ve form istekleri için rate limiting kuralları.
              </p>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-700">Aktif Rate Limit</p>
                <p className="text-lg font-semibold text-yellow-900">100 istek/dakika</p>
                <p className="text-xs text-yellow-600 mt-1">IP başına varsayılan limit</p>
              </div>
            </div>
          )}

          {activeTab === 'geoip' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">GeoIP Bilgileri</h3>
                <Link
                  href={`/dashboard/traffic/domain/${domain}/geoip`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  GeoIP Ayarları →
                </Link>
              </div>
              <p className="text-gray-600">
                Ziyaretçilerin coğrafi dağılımı ve ülke bazlı kurallar.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">En Çok Trafik</p>
                  <p className="text-lg font-semibold">🇹🇷 Türkiye</p>
                  <p className="text-xs text-gray-500">%65</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Engellenen</p>
                  <p className="text-lg font-semibold">3 Ülke</p>
                  <p className="text-xs text-gray-500">Güvenlik nedeniyle</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">VPN/Proxy</p>
                  <p className="text-lg font-semibold">%12</p>
                  <p className="text-xs text-gray-500">Tespit edildi</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Domain Ayarları</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Domain:</span>
                    <span className="text-sm font-medium">{domain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Database Schema:</span>
                    <span className="text-sm font-medium">{domainInfo?.db_schema}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Oluşturulma:</span>
                    <span className="text-sm font-medium">
                      {domainInfo?.created_at 
                        ? new Date(domainInfo.created_at).toLocaleString('tr-TR')
                        : '-'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Durum:</span>
                    <span className={`text-sm font-medium ${
                      domainInfo?.status === 'active' ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {domainInfo?.status}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Link
                    href={`/dashboard/traffic/domain/${domain}/settings`}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-center block"
                  >
                    Gelişmiş Ayarlar →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}