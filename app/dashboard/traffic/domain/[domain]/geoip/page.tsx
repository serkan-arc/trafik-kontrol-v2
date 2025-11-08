'use client'

import { useState, useEffect, use } from 'react'
import { 
  MapPin, Globe, Shield, AlertTriangle, Activity,
  Ban, CheckCircle, Settings, TrendingUp, Users,
  BarChart, Clock, Filter, Download, RefreshCw
} from 'lucide-react'

interface GeoIPRule {
  id: number
  rule_name: string
  country_code: string
  country_name: string
  action: 'allow' | 'block' | 'monitor'
  enabled: boolean
  created_at: string
  hits_count: number
  last_hit?: string
}

interface CountryStats {
  country_code: string
  country_name: string
  total_visits: number
  unique_ips: number
  blocked_count: number
  threat_level: 'low' | 'medium' | 'high'
  percentage: number
}

export default function GeoIPPage({ 
  params 
}: { 
  params: Promise<{ domain: string }> 
}) {
  const resolvedParams = use(params)
  const domain = resolvedParams.domain
  
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'countries' | 'map'>('overview')
  const [rules, setRules] = useState<GeoIPRule[]>([])
  const [countryStats, setCountryStats] = useState<CountryStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddRule, setShowAddRule] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [globalStats, setGlobalStats] = useState({
    total_countries: 0,
    blocked_countries: 0,
    monitored_countries: 0,
    total_blocks: 0,
    blocks_24h: 0,
    top_blocked_country: ''
  })

  useEffect(() => {
    fetchGeoIPData()
    const interval = setInterval(fetchGeoIPData, 30000)
    return () => clearInterval(interval)
  }, [domain])

  const fetchGeoIPData = async () => {
    setLoading(true)
    try {
      // Fetch GeoIP rules
      const rulesRes = await fetch(`/api/traffic/domains/${domain}/geoip-rules`)
      const rulesData = await rulesRes.json()
      if (rulesData.success) {
        setRules(rulesData.rules || [])
        setGlobalStats(rulesData.statistics || globalStats)
      }

      // Fetch country statistics
      const statsRes = await fetch(`/api/traffic/domains/${domain}/geoip-stats`)
      const statsData = await statsRes.json()
      if (statsData.success) {
        setCountryStats(statsData.countries || [])
      }
    } catch (error) {
      console.error('Error fetching GeoIP data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/geoip-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_name: formData.get('rule_name'),
          country_code: formData.get('country_code'),
          action: formData.get('action'),
          enabled: true
        })
      })
      
      const data = await response.json()
      if (data.success) {
        await fetchGeoIPData()
        setShowAddRule(false)
        e.currentTarget.reset()
      }
    } catch (error) {
      console.error('Error adding GeoIP rule:', error)
    }
  }

  const toggleRule = async (ruleId: number, enabled: boolean) => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/geoip-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      
      if (response.ok) {
        await fetchGeoIPData()
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  const deleteRule = async (ruleId: number) => {
    if (!confirm('Bu kuralı silmek istediğinizden emin misiniz?')) return
    
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/geoip-rules/${ruleId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchGeoIPData()
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const getCountryFlag = (code: string) => {
    return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`
  }

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">GeoIP Yönetimi</h1>
              <p className="text-gray-600">
                {domain} - Coğrafi konum bazlı trafik kontrolü
              </p>
            </div>
          </div>
          <button
            onClick={fetchGeoIPData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Yenile"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <Globe className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">{globalStats.total_countries}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Toplam Ülke</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <Ban className="w-8 h-8 text-red-500" />
            <span className="text-2xl font-bold">{globalStats.blocked_countries}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Engellenen</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <Activity className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold">{globalStats.monitored_countries}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">İzlenen</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <Shield className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">{globalStats.total_blocks}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Toplam Engel</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <Clock className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold">{globalStats.blocks_24h}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">24 Saat</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <span className="text-lg font-bold">
              {globalStats.top_blocked_country || 'N/A'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">En Çok Engel</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: BarChart },
            { id: 'rules', label: 'Kurallar', icon: Settings },
            { id: 'countries', label: 'Ülkeler', icon: Globe },
            { id: 'map', label: 'Harita', icon: MapPin }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Countries by Traffic */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                En Çok Trafik Alan Ülkeler
              </h3>
              <div className="space-y-3">
                {countryStats.slice(0, 10).map((country, idx) => (
                  <div key={country.country_code} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-500 w-6">
                        #{idx + 1}
                      </span>
                      <img 
                        src={getCountryFlag(country.country_code)} 
                        alt={country.country_code}
                        className="w-6 h-4 object-cover rounded"
                      />
                      <span className="font-medium">{country.country_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {country.total_visits.toLocaleString()} ziyaret
                      </span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${country.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {country.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blocked Countries */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                Engellenen Ülkeler
              </h3>
              <div className="space-y-3">
                {rules
                  .filter(r => r.action === 'block' && r.enabled)
                  .slice(0, 10)
                  .map(rule => (
                    <div key={rule.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={getCountryFlag(rule.country_code)} 
                          alt={rule.country_code}
                          className="w-6 h-4 object-cover rounded"
                        />
                        <span className="font-medium">{rule.country_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-red-600">
                          {rule.hits_count} engelleme
                        </span>
                        {rule.last_hit && (
                          <span className="text-xs text-gray-500">
                            Son: {new Date(rule.last_hit).toLocaleTimeString('tr-TR')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                {rules.filter(r => r.action === 'block' && r.enabled).length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    Henüz engellenen ülke yok
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Add Rule Button */}
            <div className="p-4 border-b">
              <button
                onClick={() => setShowAddRule(!showAddRule)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Yeni Kural Ekle
              </button>
            </div>

            {/* Add Rule Form */}
            {showAddRule && (
              <form onSubmit={handleAddRule} className="p-4 bg-gray-50 border-b">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="text"
                    name="rule_name"
                    placeholder="Kural Adı"
                    required
                    className="px-3 py-2 border rounded-lg"
                  />
                  
                  <select
                    name="country_code"
                    required
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="">Ülke Seçin</option>
                    <option value="CN">Çin</option>
                    <option value="RU">Rusya</option>
                    <option value="IN">Hindistan</option>
                    <option value="US">Amerika</option>
                    <option value="DE">Almanya</option>
                    <option value="FR">Fransa</option>
                    <option value="GB">İngiltere</option>
                    <option value="TR">Türkiye</option>
                    <option value="IR">İran</option>
                    <option value="KP">Kuzey Kore</option>
                  </select>
                  
                  <select
                    name="action"
                    required
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="allow">İzin Ver</option>
                    <option value="block">Engelle</option>
                    <option value="monitor">İzle</option>
                  </select>
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddRule(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Rules List */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ülke</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Kural Adı</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Aksiyon</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Hit Sayısı</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Son Hit</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Durum</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img 
                            src={getCountryFlag(rule.country_code)} 
                            alt={rule.country_code}
                            className="w-6 h-4 object-cover rounded"
                          />
                          <span className="font-medium">{rule.country_name}</span>
                          <span className="text-xs text-gray-500">({rule.country_code})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{rule.rule_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.action === 'block' ? 'bg-red-100 text-red-700' :
                          rule.action === 'allow' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {rule.action === 'block' ? 'Engelle' :
                           rule.action === 'allow' ? 'İzin Ver' : 'İzle'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{rule.hits_count}</td>
                      <td className="px-4 py-3">
                        {rule.last_hit ? new Date(rule.last_hit).toLocaleString('tr-TR') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRule(rule.id, !rule.enabled)}
                          className={`px-2 py-1 text-xs rounded-full ${
                            rule.enabled 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rule.enabled ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rules.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Henüz GeoIP kuralı tanımlanmamış
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Countries Tab */}
        {activeTab === 'countries' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ülke</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Toplam Ziyaret</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Benzersiz IP</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Engellenen</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tehdit Seviyesi</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Yüzde</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Kural</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.map(country => {
                    const rule = rules.find(r => r.country_code === country.country_code)
                    return (
                      <tr key={country.country_code} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img 
                              src={getCountryFlag(country.country_code)} 
                              alt={country.country_code}
                              className="w-6 h-4 object-cover rounded"
                            />
                            <span className="font-medium">{country.country_name}</span>
                            <span className="text-xs text-gray-500">({country.country_code})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{country.total_visits.toLocaleString()}</td>
                        <td className="px-4 py-3">{country.unique_ips.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="text-red-600">{country.blocked_count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${getThreatColor(country.threat_level)}`}>
                            {country.threat_level === 'high' ? 'Yüksek' :
                             country.threat_level === 'medium' ? 'Orta' : 'Düşük'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${country.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm">{country.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {rule ? (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              rule.action === 'block' ? 'bg-red-100 text-red-700' :
                              rule.action === 'allow' ? 'bg-green-100 text-green-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {rule.action === 'block' ? 'Engellendi' :
                               rule.action === 'allow' ? 'İzin Verildi' : 'İzleniyor'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {countryStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Henüz ülke verisi yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Dünya Haritası Görünümü
              </h3>
              <p className="text-gray-500">
                Harita görünümü yakında eklenecek. Ülkelerin coğrafi dağılımını
                görsel olarak takip edebileceksiniz.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}