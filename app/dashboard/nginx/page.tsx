'use client'

import { useState, useEffect } from 'react'

interface NginxSite {
  name: string
  path: string
  enabled: boolean
  hasSSL: boolean
  domains: string[]
  port?: number
  upstreamServers?: string[]
  lastModified?: string
  size?: number
  status?: 'active' | 'error' | 'disabled'
  syncStatus?: 'all-synced' | 'partial' | 'nginx-only' | 'unknown'
}

interface NginxStatus {
  version: string
  isRunning: boolean
  configTest: {
    valid: boolean
    message: string
  }
  uptime?: string
  connections?: {
    active: number
    reading: number
    writing: number
    waiting: number
  }
}

interface SyncReport {
  allSynced: any[]
  partialSync: any[]
  orphans: {
    pm2Only: any[]
    nginxOnly: any[]
    databaseOnly: any[]
  }
  issues: string[]
  recommendations: string[]
}

interface SyncSummary {
  totalSites: number
  fullySynced: number
  partiallySynced: number
  totalOrphans: number
  healthScore: number
}

export default function NginxManagementPage() {
  const [sites, setSites] = useState<NginxSite[]>([])
  const [nginxStatus, setNginxStatus] = useState<NginxStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSite, setSelectedSite] = useState<NginxSite | null>(null)
  const [siteConfig, setSiteConfig] = useState<string>('')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  
  // Master Sync Integration
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null)
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [showIssues, setShowIssues] = useState(false)

  // Fetch Nginx sites and status
  const fetchNginxData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/nginx')
      const data = await response.json()
      
      if (data.sites) {
        setSites(data.sites)
      }
      if (data.status) {
        setNginxStatus(data.status)
      }
      
      // Also fetch sync data
      await fetchSyncData()
    } catch (error) {
      console.error('Error fetching nginx data:', error)
      setMessage({ type: 'error', text: 'Nginx verilerini yüklerken hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  // Fetch Master Sync Report
  const fetchSyncData = async () => {
    try {
      const response = await fetch('/api/sites/sync-master')
      const data = await response.json()
      
      if (data.success) {
        setSyncReport(data.report)
        setSyncSummary(data.summary)
        
        // Update sites with sync status
        setSites(prevSites => prevSites.map(site => {
          // Find this nginx config in sync report
          const isInAllSynced = data.report.allSynced.some((s: any) => 
            s.nginx?.name === site.name || s.nginx?.domains?.includes(site.domains[0])
          )
          const isInPartial = data.report.partialSync.some((s: any) => 
            s.nginx?.name === site.name || s.nginx?.domains?.includes(site.domains[0])
          )
          const isOrphan = data.report.orphans.nginxOnly.some((s: any) => 
            s.name === site.name || s.domains?.includes(site.domains[0])
          )
          
          return {
            ...site,
            syncStatus: isInAllSynced ? 'all-synced' : isInPartial ? 'partial' : isOrphan ? 'nginx-only' : 'unknown'
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching sync data:', error)
    }
  }

  useEffect(() => {
    fetchNginxData()
  }, [])

  // Auto-dismiss messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // View/Edit site configuration
  const handleViewConfig = async (site: NginxSite) => {
    try {
      const response = await fetch(`/api/nginx/${encodeURIComponent(site.name)}`)
      const data = await response.json()
      
      if (data.content) {
        setSiteConfig(data.content)
        setSelectedSite(site)
        setShowConfigModal(true)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Error fetching site config:', error)
      setMessage({ type: 'error', text: 'Konfigürasyon yüklenirken hata oluştu' })
    }
  }

  // Save edited configuration
  const handleSaveConfig = async () => {
    if (!selectedSite) return

    try {
      const response = await fetch(`/api/nginx/${encodeURIComponent(selectedSite.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update',
          content: siteConfig 
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Konfigürasyon başarıyla güncellendi' })
        setShowConfigModal(false)
        setEditMode(false)
        fetchNginxData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Konfigürasyon güncellenemedi' })
      }
    } catch (error) {
      console.error('Error saving config:', error)
      setMessage({ type: 'error', text: 'Konfigürasyon kaydedilirken hata oluştu' })
    }
  }

  // Enable/Disable site
  const handleToggleSite = async (site: NginxSite) => {
    const action = site.enabled ? 'disable' : 'enable'
    
    try {
      const response = await fetch(`/api/nginx/${encodeURIComponent(site.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `${site.name} başarıyla ${action === 'enable' ? 'etkinleştirildi' : 'devre dışı bırakıldı'}` 
        })
        fetchNginxData()
      } else {
        setMessage({ type: 'error', text: data.error || 'İşlem başarısız' })
      }
    } catch (error) {
      console.error('Error toggling site:', error)
      setMessage({ type: 'error', text: 'Site durumu değiştirilirken hata oluştu' })
    }
  }

  // Delete site configuration
  const handleDeleteSite = async (site: NginxSite) => {
    if (!confirm(`${site.name} konfigürasyonunu silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/nginx/${encodeURIComponent(site.name)}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: `${site.name} başarıyla silindi` })
        fetchNginxData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Silme işlemi başarısız' })
      }
    } catch (error) {
      console.error('Error deleting site:', error)
      setMessage({ type: 'error', text: 'Site silinirken hata oluştu' })
    }
  }

  // Nginx service controls
  const handleServiceAction = async (action: 'start' | 'stop' | 'restart' | 'reload' | 'test') => {
    try {
      const response = await fetch('/api/nginx/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: action === 'test' ? 'Konfigürasyon testi başarılı' : `Nginx ${action} işlemi başarılı` 
        })
        if (action !== 'test') {
          setTimeout(fetchNginxData, 2000)
        }
      } else {
        setMessage({ type: 'error', text: data.error || `${action} işlemi başarısız` })
      }
    } catch (error) {
      console.error(`Error ${action} nginx:`, error)
      setMessage({ type: 'error', text: `Nginx ${action} işlemi sırasında hata oluştu` })
    }
  }

  // Master Sync - Auto Fix
  const handleAutoFix = async (dryRun: boolean = false) => {
    try {
      setSyncLoading(true)
      const response = await fetch('/api/sites/sync-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          removeOrphanPM2: true,
          removeOrphanNginx: true,
          updateDatabaseStatus: true,
          dryRun
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        if (dryRun) {
          setMessage({ 
            type: 'info', 
            text: `Dry run: ${data.summary.fixedCount} sorun tespit edildi (henüz düzeltilmedi)` 
          })
        } else {
          setMessage({ 
            type: 'success', 
            text: `${data.summary.fixedCount} sorun düzeltildi! Sağlık skoru: ${data.summary.beforeHealth.toFixed(1)}% → ${data.summary.afterHealth.toFixed(1)}%` 
          })
          // Reload data after fix
          setTimeout(fetchNginxData, 1000)
        }
        
        // Show detailed results in modal
        setSyncReport(data.afterReport || data.beforeReport)
        setShowSyncModal(true)
      } else {
        setMessage({ type: 'error', text: data.error || 'Auto-fix işlemi başarısız' })
      }
    } catch (error) {
      console.error('Error running auto-fix:', error)
      setMessage({ type: 'error', text: 'Auto-fix sırasında hata oluştu' })
    } finally {
      setSyncLoading(false)
    }
  }

  // Filter sites
  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (site.domains && site.domains.length > 0 && site.domains.some(d => d.toLowerCase().includes(searchTerm.toLowerCase())))
    
    const matchesFilter = filterEnabled === 'all' || 
                         (filterEnabled === 'enabled' && site.enabled) ||
                         (filterEnabled === 'disabled' && !site.enabled)
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌐</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                Nginx Yönetimi
                {syncSummary && (
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    syncSummary.healthScore >= 90 ? 'bg-green-100 text-green-700' :
                    syncSummary.healthScore >= 70 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    🎯 Sağlık: {syncSummary.healthScore.toFixed(0)}%
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Nginx konfigürasyonlarını yönet ve izle
                {syncSummary && (
                  <span className="ml-2 text-xs">
                    • {syncSummary.fullySynced}/{syncSummary.totalSites} tam senkronize
                    {syncSummary.totalOrphans > 0 && (
                      <span className="text-orange-600 font-medium"> • {syncSummary.totalOrphans} orphan tespit edildi</span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Service Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleServiceAction('test')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              ⚙️ Test Config
            </button>
            <button
              onClick={() => handleServiceAction('reload')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              🔄 Reload
            </button>
            <button
              onClick={() => handleServiceAction('restart')}
              className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-2"
            >
              ⚡ Restart
            </button>
            {syncSummary && syncSummary.healthScore < 100 && (
              <button
                onClick={() => handleAutoFix(false)}
                disabled={syncLoading}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-md"
              >
                {syncLoading ? '⏳' : '🔧'} Master Sync
              </button>
            )}
          </div>
        </div>

        {/* Status Bar */}
        {nginxStatus && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${nginxStatus.isRunning ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm font-medium">
                {nginxStatus.isRunning ? 'Çalışıyor' : 'Durduruldu'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Versiyon:</span> {nginxStatus.version}
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Konfigürasyon:</span>
              <span className={`ml-1 ${nginxStatus.configTest?.valid ? 'text-green-600' : 'text-red-600'}`}>
                {nginxStatus.configTest?.valid ? 'Geçerli' : 'Hatalı'}
              </span>
            </div>
            {nginxStatus.uptime && (
              <div className="text-sm">
                <span className="text-gray-600">Çalışma Süresi:</span> {nginxStatus.uptime}
              </div>
            )}
          </div>
        )}
        
        {/* Sync Issues Panel */}
        {syncReport && (syncReport.issues.length > 0 || syncReport.orphans.nginxOnly.length > 0) && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowIssues(!showIssues)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-orange-500">⚠️</span>
                <span className="font-medium text-gray-900">
                  Senkronizasyon Sorunları ({syncReport.issues.length + syncReport.orphans.nginxOnly.length})
                </span>
              </div>
              <span>{showIssues ? '▼' : '▶'}</span>
            </button>
            
            {showIssues && (
              <div className="mt-3 space-y-2">
                {syncReport.orphans.nginxOnly.length > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="font-medium text-orange-900 mb-2">
                      🚨 Orphan Nginx Configs ({syncReport.orphans.nginxOnly.length})
                    </div>
                    <ul className="text-sm text-orange-800 space-y-1">
                      {syncReport.orphans.nginxOnly.slice(0, 5).map((orphan: any, i: number) => (
                        <li key={i}>
                          • {orphan.name || orphan.domains?.join(', ')} - PM2 veya Database'de bulunamadı
                        </li>
                      ))}
                      {syncReport.orphans.nginxOnly.length > 5 && (
                        <li className="text-xs">...ve {syncReport.orphans.nginxOnly.length - 5} tane daha</li>
                      )}
                    </ul>
                  </div>
                )}
                
                {syncReport.issues.slice(0, 5).map((issue: string, i: number) => (
                  <div key={i} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
                    • {issue}
                  </div>
                ))}
                
                {syncReport.recommendations.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-blue-900 mb-2">💡 Öneriler</div>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {syncReport.recommendations.slice(0, 3).map((rec: string, i: number) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAutoFix(true)}
                    disabled={syncLoading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    👁️ Önizleme (Dry Run)
                  </button>
                  <button
                    onClick={() => handleAutoFix(false)}
                    disabled={syncLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    🔧 Tüm Sorunları Düzelt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <input
              type="text"
              placeholder="Site veya domain ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex-1 max-w-md"
            />
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterEnabled('all')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  filterEnabled === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tümü ({sites.length})
              </button>
              <button
                onClick={() => setFilterEnabled('enabled')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  filterEnabled === 'enabled' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Aktif ({sites.filter(s => s.enabled).length})
              </button>
              <button
                onClick={() => setFilterEnabled('disabled')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  filterEnabled === 'disabled' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pasif ({sites.filter(s => !s.enabled).length})
              </button>
            </div>
          </div>
          
          <button
            onClick={fetchNginxData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            🔄 Yenile
          </button>
        </div>
      </div>

      {/* Sites Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Senkronizasyon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain(ler)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SSL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Port / Upstream
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Son Değişiklik
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-5xl">📄</span>
                      <p>Hiç site konfigürasyonu bulunamadı</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => (
                  <tr key={site.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {site.enabled ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                              ✓ Aktif
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              ✗ Pasif
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {site.syncStatus === 'all-synced' && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded flex items-center gap-1 w-fit">
                          ✓ Tam Senkron
                        </span>
                      )}
                      {site.syncStatus === 'partial' && (
                        <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded flex items-center gap-1 w-fit">
                          ⚠️ Kısmi
                        </span>
                      )}
                      {site.syncStatus === 'nginx-only' && (
                        <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded flex items-center gap-1 w-fit">
                          ❌ Orphan
                        </span>
                      )}
                      {site.syncStatus === 'unknown' && (
                        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded flex items-center gap-1 w-fit">
                          ? Bilinmiyor
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{site.name}</div>
                      <div className="text-xs text-gray-500">{site.path}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {site.domains && site.domains.length > 0 ? (
                          <div className="space-y-1">
                            {site.domains.slice(0, 2).map((domain) => (
                              <div key={domain} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block mr-1">
                                {domain}
                              </div>
                            ))}
                            {site.domains.length > 2 && (
                              <span className="text-xs text-gray-500">+{site.domains.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {site.hasSSL ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-green-700">🔒 SSL</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No SSL</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {site.port ? (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Port: {site.port}
                        </span>
                      ) : site.upstreamServers && site.upstreamServers.length > 0 ? (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {site.upstreamServers.length} upstream
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {site.lastModified ? new Date(site.lastModified).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewConfig(site)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Konfigürasyonu Görüntüle"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleToggleSite(site)}
                          className={site.enabled ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                          title={site.enabled ? 'Devre Dışı Bırak' : 'Etkinleştir'}
                        >
                          {site.enabled ? '🚫' : '✅'}
                        </button>
                        <button
                          onClick={() => handleDeleteSite(site)}
                          className="text-red-600 hover:text-red-900"
                          title="Sil"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedSite.name} - Nginx Konfigürasyonu
                </h2>
                <p className="text-sm text-gray-600 mt-1">{selectedSite.path}</p>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    ✏️ Düzenle
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveConfig}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      💾 Kaydet
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false)
                        handleViewConfig(selectedSite)
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      ❌ İptal
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowConfigModal(false)
                    setEditMode(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              <textarea
                value={siteConfig}
                onChange={(e) => setSiteConfig(e.target.value)}
                readOnly={!editMode}
                className={`w-full h-full min-h-[400px] font-mono text-sm p-4 border rounded-lg ${
                  editMode 
                    ? 'bg-gray-900 text-green-400 border-gray-700 focus:ring-2 focus:ring-indigo-500' 
                    : 'bg-gray-50 text-gray-800 border-gray-200'
                }`}
                style={{ resize: 'none' }}
                spellCheck={false}
              />
            </div>

            {/* Modal Footer */}
            {editMode && (
              <div className="p-4 border-t border-gray-200 bg-yellow-50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <p className="text-sm text-yellow-800">
                    Dikkat: Yanlış konfigürasyon Nginx'in çalışmasını durdurabilir. Değişiklikleri kaydetmeden önce kontrol edin.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Report Modal */}
      {showSyncModal && syncReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Master Sync Raporu</h2>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* Summary Stats */}
              {syncSummary && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{syncSummary.fullySynced}</div>
                    <div className="text-xs text-green-600">Tam Senkron</div>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-700">{syncSummary.partiallySynced}</div>
                    <div className="text-xs text-yellow-600">Kısmi Senkron</div>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">{syncSummary.totalOrphans}</div>
                    <div className="text-xs text-red-600">Orphan</div>
                  </div>
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-700">{syncSummary.healthScore.toFixed(0)}%</div>
                    <div className="text-xs text-indigo-600">Sağlık Skoru</div>
                  </div>
                </div>
              )}
              
              {/* All Synced Sites */}
              {syncReport.allSynced.length > 0 && (
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <div className="bg-green-50 px-4 py-2 font-medium text-green-900">
                    ✓ Tam Senkron ({syncReport.allSynced.length})
                  </div>
                  <div className="p-4 space-y-2 max-h-40 overflow-y-auto">
                    {syncReport.allSynced.map((site: any, i: number) => (
                      <div key={i} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-green-500">●</span>
                        {site.name || site.pm2?.name || site.nginx?.name || site.database?.domain}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Partial Sync Sites */}
              {syncReport.partialSync.length > 0 && (
                <div className="border border-yellow-200 rounded-lg overflow-hidden">
                  <div className="bg-yellow-50 px-4 py-2 font-medium text-yellow-900">
                    ⚠️ Kısmi Senkron ({syncReport.partialSync.length})
                  </div>
                  <div className="p-4 space-y-2 max-h-40 overflow-y-auto">
                    {syncReport.partialSync.map((site: any, i: number) => (
                      <div key={i} className="text-sm text-gray-700">
                        <div className="font-medium">{site.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          {site.pm2 && <span className="text-blue-600">✓ PM2</span>}
                          {site.nginx && <span className="text-green-600">✓ Nginx</span>}
                          {site.database && <span className="text-purple-600">✓ DB</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Orphans */}
              {(syncReport.orphans.pm2Only.length > 0 || syncReport.orphans.nginxOnly.length > 0 || syncReport.orphans.databaseOnly.length > 0) && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 font-medium text-red-900">
                    ❌ Orphan Kaynaklar
                  </div>
                  <div className="p-4 space-y-3">
                    {syncReport.orphans.pm2Only.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-blue-700 mb-1">PM2 Only ({syncReport.orphans.pm2Only.length}):</div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {syncReport.orphans.pm2Only.slice(0, 3).map((p: any, i: number) => (
                            <div key={i}>• {p.name} (Port: {p.port})</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {syncReport.orphans.nginxOnly.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-green-700 mb-1">Nginx Only ({syncReport.orphans.nginxOnly.length}):</div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {syncReport.orphans.nginxOnly.slice(0, 3).map((n: any, i: number) => (
                            <div key={i}>• {n.name || n.domains?.join(', ')}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {syncReport.orphans.databaseOnly.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-purple-700 mb-1">Database Only ({syncReport.orphans.databaseOnly.length}):</div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {syncReport.orphans.databaseOnly.slice(0, 3).map((d: any, i: number) => (
                            <div key={i}>• {d.domain} ({d.name})</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-600 text-white' :
            message.type === 'error' ? 'bg-red-600 text-white' :
            'bg-blue-600 text-white'
          }`}>
            {message.type === 'success' && <span>✅</span>}
            {message.type === 'error' && <span>❌</span>}
            <span>{message.text}</span>
          </div>
        </div>
      )}
    </div>
  )
}