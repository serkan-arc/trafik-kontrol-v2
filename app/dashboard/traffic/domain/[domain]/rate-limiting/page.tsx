'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface RateLimitRule {
  id: string
  rule_name: string
  path_pattern: string
  method: string | null
  rate_limit: number
  window_seconds: number
  burst_limit: number | null
  action: 'throttle' | 'block' | 'challenge' | 'log'
  enabled: boolean
  created_at: string
  updated_at: string
}

interface RateLimitStats {
  total_rules: number
  enabled_rules: number
  throttled_requests_today: number
  blocked_requests_today: number
  top_limited_paths: Array<{
    path: string
    count: number
  }>
  top_limited_ips: Array<{
    ip: string
    count: number
  }>
}

export default function DomainRateLimiting({ params }: { params: Promise<{ domain: string }> }) {
  const resolvedParams = use(params)
  const domain = resolvedParams.domain
  
  const [rules, setRules] = useState<RateLimitRule[]>([])
  const [stats, setStats] = useState<RateLimitStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRule, setEditingRule] = useState<RateLimitRule | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    rule_name: '',
    path_pattern: '',
    method: '',
    rate_limit: 100,
    window_seconds: 60,
    burst_limit: 150,
    action: 'throttle' as RateLimitRule['action'],
    enabled: true
  })

  // Test form
  const [testData, setTestData] = useState({
    path: '/api/contact',
    method: 'POST',
    ip: '192.168.1.1'
  })

  // Predefined rate limit templates
  const templates = [
    { 
      name: 'API Endpoint', 
      path: '/api/*', 
      rate: 100, 
      window: 60, 
      burst: 150,
      description: 'Standard API rate limiting' 
    },
    { 
      name: 'Login Protection', 
      path: '/login', 
      rate: 5, 
      window: 300, 
      burst: 10,
      description: 'Prevent brute force attacks' 
    },
    { 
      name: 'Contact Form', 
      path: '/contact', 
      rate: 3, 
      window: 600, 
      burst: 5,
      description: 'Limit form submissions' 
    },
    { 
      name: 'Search Endpoint', 
      path: '/search', 
      rate: 30, 
      window: 60, 
      burst: 50,
      description: 'Prevent search abuse' 
    },
    { 
      name: 'File Upload', 
      path: '/upload', 
      rate: 10, 
      window: 3600, 
      burst: 15,
      description: 'Limit file uploads per hour' 
    },
    { 
      name: 'Webhook', 
      path: '/webhook/*', 
      rate: 1000, 
      window: 60, 
      burst: 1500,
      description: 'High-volume webhook endpoint' 
    }
  ]

  // Fetch rate limit rules
  const fetchRules = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/rate-limits`)
      const data = await response.json()
      if (data.success) {
        setRules(data.rules)
        setStats(data.statistics)
      }
    } catch (error) {
      console.error('Error fetching rate limit rules:', error)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchRules()
      setLoading(false)
    }
    init()
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchRules, 30000)
    return () => clearInterval(interval)
  }, [domain])

  // Add/Update rule
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingRule 
        ? `/api/traffic/domains/${domain}/rate-limits/${editingRule.id}`
        : `/api/traffic/domains/${domain}/rate-limits`
      
      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          method: formData.method || null,
          burst_limit: formData.burst_limit || null
        })
      })
      
      if (response.ok) {
        await fetchRules()
        setShowAddModal(false)
        setEditingRule(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving rate limit rule:', error)
    }
  }

  // Delete rule
  const handleDelete = async (ruleId: string) => {
    if (!confirm('Bu rate limit kuralını silmek istediğinizden emin misiniz?')) return
    
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/rate-limits/${ruleId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error deleting rate limit rule:', error)
    }
  }

  // Toggle rule enabled/disabled
  const handleToggle = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/rate-limits/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      
      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error toggling rate limit rule:', error)
    }
  }

  // Test rate limit
  const handleTest = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/rate-limits/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })
      
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      console.error('Error testing rate limit:', error)
    }
  }

  // Apply template
  const applyTemplate = (template: typeof templates[0]) => {
    setFormData({
      rule_name: template.name,
      path_pattern: template.path,
      method: '',
      rate_limit: template.rate,
      window_seconds: template.window,
      burst_limit: template.burst,
      action: 'throttle',
      enabled: true
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      rule_name: '',
      path_pattern: '',
      method: '',
      rate_limit: 100,
      window_seconds: 60,
      burst_limit: 150,
      action: 'throttle',
      enabled: true
    })
  }

  const openEditModal = (rule: RateLimitRule) => {
    setEditingRule(rule)
    setFormData({
      rule_name: rule.rule_name,
      path_pattern: rule.path_pattern,
      method: rule.method || '',
      rate_limit: rule.rate_limit,
      window_seconds: rule.window_seconds,
      burst_limit: rule.burst_limit || 0,
      action: rule.action,
      enabled: rule.enabled
    })
    setShowAddModal(true)
  }

  const formatWindow = (seconds: number) => {
    if (seconds >= 3600) return `${seconds / 3600} saat`
    if (seconds >= 60) return `${seconds / 60} dakika`
    return `${seconds} saniye`
  }

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
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link 
                href={`/dashboard/traffic/domain/${domain}`} 
                className="text-gray-500 hover:text-gray-700"
              >
                {domain}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-semibold">Rate Limiting</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">⏱️ Rate Limiting & Throttling</h1>
            <p className="text-sm text-gray-600 mt-1">Domain-specific rate limit kuralları ve API throttling</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingRule(null)
              setShowAddModal(true)
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Yeni Kural
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600">Toplam Kural</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_rules}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600">Aktif Kural</p>
            <p className="text-2xl font-bold text-green-600">{stats.enabled_rules}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600">Throttled (Bugün)</p>
            <p className="text-2xl font-bold text-orange-600">{stats.throttled_requests_today}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600">Blocked (Bugün)</p>
            <p className="text-2xl font-bold text-red-600">{stats.blocked_requests_today}</p>
          </div>
        </div>
      )}

      {/* Templates */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Hızlı Template Kullanımı</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {templates.map((template, index) => (
            <button
              key={index}
              onClick={() => applyTemplate(template)}
              className="px-3 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 text-xs text-center"
              title={template.description}
            >
              <div className="font-semibold">{template.name}</div>
              <div className="text-xs opacity-75">{template.rate}/{formatWindow(template.window)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold">Rate Limit Kuralları</h3>
        </div>
        
        <div className="p-4 space-y-4">
          {rules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Henüz rate limit kuralı eklenmemiş. Template kullanarak veya yeni kural ekleyerek başlayın.
            </p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{rule.rule_name}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        rule.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {rule.enabled ? 'Aktif' : 'Pasif'}
                      </span>
                      {rule.method && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {rule.method}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Path:</span>
                        <span className="ml-2 font-mono text-gray-700">{rule.path_pattern}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Limit:</span>
                        <span className="ml-2 font-semibold">
                          {rule.rate_limit}/{formatWindow(rule.window_seconds)}
                        </span>
                      </div>
                      {rule.burst_limit && (
                        <div>
                          <span className="text-gray-500">Burst:</span>
                          <span className="ml-2">{rule.burst_limit}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Action:</span>
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                          rule.action === 'block' ? 'bg-red-100 text-red-700' :
                          rule.action === 'throttle' ? 'bg-orange-100 text-orange-700' :
                          rule.action === 'challenge' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {rule.action}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggle(rule.id, !rule.enabled)}
                      className={`px-3 py-1 text-xs rounded ${
                        rule.enabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {rule.enabled ? 'Aktif' : 'Pasif'}
                    </button>
                    <button
                      onClick={() => openEditModal(rule)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Rate Limit Test</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
            <input
              type="text"
              value={testData.path}
              onChange={(e) => setTestData({ ...testData, path: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select
              value={testData.method}
              onChange={(e) => setTestData({ ...testData, method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
            <input
              type="text"
              value={testData.ip}
              onChange={(e) => setTestData({ ...testData, ip: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <button
          onClick={handleTest}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Test Et
        </button>
        
        {testResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            testResult.allowed 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 ${
              testResult.allowed ? 'text-green-900' : 'text-red-900'
            }`}>
              {testResult.allowed ? '✅ İstek İzin Verildi' : '❌ İstek Engellendi'}
            </h4>
            <div className="space-y-1 text-sm">
              {testResult.matched_rule && (
                <p>Eşleşen Kural: <strong>{testResult.matched_rule}</strong></p>
              )}
              {testResult.remaining && (
                <p>Kalan İstek: <strong>{testResult.remaining}</strong></p>
              )}
              {testResult.reset_in && (
                <p>Reset: <strong>{testResult.reset_in} saniye</strong></p>
              )}
              {testResult.reason && (
                <p className="text-red-600">Sebep: {testResult.reason}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Limited Stats */}
      {stats && (stats.top_limited_paths.length > 0 || stats.top_limited_ips.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">En Çok Limitlenen Pathler</h3>
            <div className="space-y-2">
              {stats.top_limited_paths.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm font-mono text-gray-600">{item.path}</span>
                  <span className="text-sm font-semibold text-orange-600">{item.count} limit</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">En Çok Limitlenen IP'ler</h3>
            <div className="space-y-2">
              {stats.top_limited_ips.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm font-mono text-gray-600">{item.ip}</span>
                  <span className="text-sm font-semibold text-red-600">{item.count} limit</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              {editingRule ? 'Rate Limit Kuralı Düzenle' : 'Yeni Rate Limit Kuralı'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kural Adı
                  </label>
                  <input
                    type="text"
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Path Pattern
                  </label>
                  <input
                    type="text"
                    value={formData.path_pattern}
                    onChange={(e) => setFormData({ ...formData, path_pattern: e.target.value })}
                    placeholder="/api/* veya /login"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTTP Method (Opsiyonel)
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Tümü</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İstek Limiti
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.rate_limit}
                    onChange={(e) => setFormData({ ...formData, rate_limit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zaman Penceresi (saniye)
                  </label>
                  <select
                    value={formData.window_seconds}
                    onChange={(e) => setFormData({ ...formData, window_seconds: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1">1 saniye</option>
                    <option value="10">10 saniye</option>
                    <option value="30">30 saniye</option>
                    <option value="60">1 dakika</option>
                    <option value="300">5 dakika</option>
                    <option value="600">10 dakika</option>
                    <option value="1800">30 dakika</option>
                    <option value="3600">1 saat</option>
                    <option value="86400">1 gün</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Burst Limit (Opsiyonel)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.burst_limit}
                    onChange={(e) => setFormData({ ...formData, burst_limit: parseInt(e.target.value) })}
                    placeholder="Anlık maksimum istek"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aksiyon
                  </label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="throttle">Throttle (429 döndür)</option>
                    <option value="block">Block (403 döndür)</option>
                    <option value="challenge">Challenge (CAPTCHA)</option>
                    <option value="log">Sadece Logla</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="enabled" className="text-sm text-gray-700">
                    Kural Aktif
                  </label>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Kural Özeti</h4>
                <p className="text-sm text-gray-600">
                  {formData.path_pattern || '[path]'} için {formData.method || 'tüm'} isteklerde,{' '}
                  {formatWindow(formData.window_seconds)} içinde maksimum {formData.rate_limit} istek izin verilecek.
                  {formData.burst_limit > 0 && ` Anlık burst limiti: ${formData.burst_limit}.`}
                  {' '}Limit aşıldığında: <strong>{formData.action}</strong>
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingRule(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingRule ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}