'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface SpamPattern {
  id: string
  pattern_name: string
  pattern_type: 'keyword' | 'email_domain' | 'url_pattern' | 'content_hash' | 'behavior' | 'regex'
  pattern_value: string
  is_regex: boolean
  severity: number
  category: string
  action: 'flag' | 'block' | 'quarantine' | 'log_only'
  enabled: boolean
  matches_count: number
  false_positive_count: number
  last_matched_at: string | null
  description: string
  created_at: string
  updated_at: string
}

interface SpamDetection {
  id: string
  ip_address: string
  form_type: string
  spam_score: number
  matched_patterns: Array<{
    pattern_id: string
    pattern_name: string
    severity: number
  }>
  action: string
  blocked: boolean
  email: string
  email_is_disposable: boolean
  phone: string
  contains_urls: boolean
  url_count: number
  content: string
  created_at: string
}

export default function DomainSpamControl({ params }: { params: Promise<{ domain: string }> }) {
  const resolvedParams = use(params)
  const domain = resolvedParams.domain
  
  const [patterns, setPatterns] = useState<SpamPattern[]>([])
  const [detections, setDetections] = useState<SpamDetection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('patterns')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<SpamPattern | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form states
  const [formData, setFormData] = useState({
    pattern_name: '',
    pattern_type: 'keyword' as SpamPattern['pattern_type'],
    pattern_value: '',
    is_regex: false,
    severity: 5,
    category: '',
    action: 'flag' as SpamPattern['action'],
    description: '',
    enabled: true
  })

  // Predefined spam patterns for quick add
  const predefinedPatterns = [
    { name: 'Viagra/Pharmacy', type: 'keyword', value: 'viagra|cialis|pharmacy|pills', severity: 8 },
    { name: 'Casino/Gambling', type: 'keyword', value: 'casino|poker|betting|jackpot', severity: 7 },
    { name: 'Disposable Emails', type: 'email_domain', value: 'tempmail.com|guerrillamail.com|mailinator.com', severity: 6 },
    { name: 'URL Shorteners', type: 'url_pattern', value: 'bit.ly|tinyurl.com|short.link', severity: 5 },
    { name: 'Excessive URLs', type: 'behavior', value: 'url_count > 3', severity: 7 },
    { name: 'Russian Spam', type: 'regex', value: '[а-яА-Я]{10,}', severity: 6 }
  ]

  // Fetch spam patterns
  const fetchPatterns = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/spam-patterns`)
      const data = await response.json()
      if (data.success) {
        setPatterns(data.patterns)
      }
    } catch (error) {
      console.error('Error fetching spam patterns:', error)
    }
  }

  // Fetch spam detections
  const fetchDetections = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/spam-detections`)
      const data = await response.json()
      if (data.success) {
        setDetections(data.detections)
      }
    } catch (error) {
      console.error('Error fetching spam detections:', error)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchPatterns(), fetchDetections()])
      setLoading(false)
    }
    init()
  }, [domain])

  // Add/Update spam pattern
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingPattern 
        ? `/api/traffic/domains/${domain}/spam-patterns/${editingPattern.id}`
        : `/api/traffic/domains/${domain}/spam-patterns`
      
      const response = await fetch(url, {
        method: editingPattern ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        await fetchPatterns()
        setShowAddModal(false)
        setEditingPattern(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving spam pattern:', error)
    }
  }

  // Delete spam pattern
  const handleDelete = async (patternId: string) => {
    if (!confirm('Bu spam pattern\'i silmek istediğinizden emin misiniz?')) return
    
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/spam-patterns/${patternId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchPatterns()
      }
    } catch (error) {
      console.error('Error deleting spam pattern:', error)
    }
  }

  // Toggle pattern enabled/disabled
  const handleToggle = async (patternId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/spam-patterns/${patternId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      
      if (response.ok) {
        await fetchPatterns()
      }
    } catch (error) {
      console.error('Error toggling spam pattern:', error)
    }
  }

  // Mark as false positive
  const handleFalsePositive = async (patternId: string) => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/spam-patterns/${patternId}/false-positive`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchPatterns()
      }
    } catch (error) {
      console.error('Error marking false positive:', error)
    }
  }

  // Add predefined pattern
  const addPredefinedPattern = async (pattern: typeof predefinedPatterns[0]) => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/spam-patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern_name: pattern.name,
          pattern_type: pattern.type,
          pattern_value: pattern.value,
          is_regex: pattern.type === 'regex',
          severity: pattern.severity,
          category: 'predefined',
          action: pattern.severity >= 7 ? 'block' : 'flag',
          description: `Predefined pattern for ${pattern.name}`,
          enabled: true
        })
      })
      
      if (response.ok) {
        await fetchPatterns()
      }
    } catch (error) {
      console.error('Error adding predefined pattern:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      pattern_name: '',
      pattern_type: 'keyword',
      pattern_value: '',
      is_regex: false,
      severity: 5,
      category: '',
      action: 'flag',
      description: '',
      enabled: true
    })
  }

  const openEditModal = (pattern: SpamPattern) => {
    setEditingPattern(pattern)
    setFormData({
      pattern_name: pattern.pattern_name,
      pattern_type: pattern.pattern_type,
      pattern_value: pattern.pattern_value,
      is_regex: pattern.is_regex,
      severity: pattern.severity,
      category: pattern.category,
      action: pattern.action,
      description: pattern.description,
      enabled: pattern.enabled
    })
    setShowAddModal(true)
  }

  // Filter patterns
  const filteredPatterns = patterns.filter(pattern => {
    if (filterType !== 'all' && pattern.pattern_type !== filterType) return false
    if (searchTerm && !pattern.pattern_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !pattern.pattern_value.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Statistics
  const stats = {
    total_patterns: patterns.length,
    enabled_patterns: patterns.filter(p => p.enabled).length,
    high_severity: patterns.filter(p => p.severity >= 8).length,
    total_detections: detections.length,
    blocked_detections: detections.filter(d => d.blocked).length,
    disposable_emails: detections.filter(d => d.email_is_disposable).length,
    avg_spam_score: detections.length > 0 
      ? Math.round(detections.reduce((sum, d) => sum + d.spam_score, 0) / detections.length)
      : 0
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
              <span className="text-gray-900 font-semibold">Spam Control</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">🚫 Spam Control & Protection</h1>
            <p className="text-sm text-gray-600 mt-1">Domain-specific spam patterns ve filtreleme yönetimi</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm()
                setEditingPattern(null)
                setShowAddModal(true)
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              + Yeni Pattern
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Toplam Pattern</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total_patterns}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Aktif</p>
          <p className="text-2xl font-bold text-green-600">{stats.enabled_patterns}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Yüksek Risk</p>
          <p className="text-2xl font-bold text-red-600">{stats.high_severity}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Tespit</p>
          <p className="text-2xl font-bold text-purple-600">{stats.total_detections}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Engellenen</p>
          <p className="text-2xl font-bold text-orange-600">{stats.blocked_detections}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Disposable</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.disposable_emails}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Ort. Skor</p>
          <p className="text-2xl font-bold text-blue-600">{stats.avg_spam_score}%</p>
        </div>
      </div>

      {/* Quick Add Predefined Patterns */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Hızlı Pattern Ekleme</h3>
        <div className="flex flex-wrap gap-2">
          {predefinedPatterns.map((pattern, index) => (
            <button
              key={index}
              onClick={() => addPredefinedPattern(pattern)}
              className="px-3 py-1 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 text-xs"
            >
              + {pattern.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('patterns')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'patterns'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Spam Patterns ({patterns.length})
            </button>
            <button
              onClick={() => setActiveTab('detections')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'detections'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Detections ({detections.length})
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'statistics'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              İstatistikler
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'patterns' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Pattern ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Tüm Tipler</option>
                  <option value="keyword">Keyword</option>
                  <option value="email_domain">Email Domain</option>
                  <option value="url_pattern">URL Pattern</option>
                  <option value="content_hash">Content Hash</option>
                  <option value="behavior">Behavior</option>
                  <option value="regex">Regex</option>
                </select>
              </div>

              {/* Pattern List */}
              {filteredPatterns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Pattern bulunamadı. Yeni pattern ekleyerek başlayın.
                </p>
              ) : (
                filteredPatterns.map((pattern) => (
                  <div key={pattern.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{pattern.pattern_name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            pattern.pattern_type === 'keyword' ? 'bg-blue-100 text-blue-800' :
                            pattern.pattern_type === 'email_domain' ? 'bg-green-100 text-green-800' :
                            pattern.pattern_type === 'url_pattern' ? 'bg-yellow-100 text-yellow-800' :
                            pattern.pattern_type === 'regex' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {pattern.pattern_type}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            pattern.severity >= 8 ? 'bg-red-100 text-red-700' :
                            pattern.severity >= 5 ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            Severity: {pattern.severity}
                          </span>
                          {pattern.is_regex && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Regex
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono text-gray-600 mb-2 break-all">
                          {pattern.pattern_value}
                        </p>
                        {pattern.description && (
                          <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Action: <strong>{pattern.action}</strong></span>
                          <span>Matches: <strong>{pattern.matches_count}</strong></span>
                          <span>False Positives: <strong>{pattern.false_positive_count}</strong></span>
                          {pattern.last_matched_at && (
                            <span>Last Match: {new Date(pattern.last_matched_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(pattern.id, !pattern.enabled)}
                          className={`px-3 py-1 text-xs rounded ${
                            pattern.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pattern.enabled ? 'Aktif' : 'Pasif'}
                        </button>
                        <button
                          onClick={() => handleFalsePositive(pattern.id)}
                          className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                        >
                          False +
                        </button>
                        <button
                          onClick={() => openEditModal(pattern)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(pattern.id)}
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
          )}

          {activeTab === 'detections' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">IP</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Email</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Form Type</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Spam Score</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Patterns</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Action</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {detections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        Henüz spam tespiti yapılmamış.
                      </td>
                    </tr>
                  ) : (
                    detections.slice(0, 50).map((detection) => (
                      <tr key={detection.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 text-sm font-mono">{detection.ip_address}</td>
                        <td className="py-2 px-3 text-sm">
                          {detection.email}
                          {detection.email_is_disposable && (
                            <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1 rounded">
                              disposable
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-sm">{detection.form_type}</td>
                        <td className="py-2 px-3">
                          <span className={`text-sm font-semibold ${
                            detection.spam_score >= 80 ? 'text-red-600' :
                            detection.spam_score >= 50 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {detection.spam_score}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {detection.matched_patterns.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {detection.matched_patterns.map((p, i) => (
                                <span key={i} className="bg-gray-100 text-gray-700 px-1 rounded">
                                  {p.pattern_name}
                                </span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            detection.blocked
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {detection.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">
                          {new Date(detection.created_at).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Pattern Performansı</h3>
                  <div className="space-y-2">
                    {patterns
                      .sort((a, b) => b.matches_count - a.matches_count)
                      .slice(0, 10)
                      .map((pattern) => (
                        <div key={pattern.id} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{pattern.pattern_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{pattern.matches_count} eşleşme</span>
                            {pattern.false_positive_count > 0 && (
                              <span className="text-xs text-red-600">
                                ({pattern.false_positive_count} FP)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Spam Kaynakları</h3>
                  <div className="space-y-2">
                    {/* Group detections by IP and show top spammers */}
                    {Object.entries(
                      detections.reduce((acc: Record<string, number>, d) => {
                        acc[d.ip_address] = (acc[d.ip_address] || 0) + 1
                        return acc
                      }, {})
                    )
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([ip, count]) => (
                        <div key={ip} className="flex justify-between items-center">
                          <span className="text-sm font-mono text-gray-600">{ip}</span>
                          <span className="text-sm font-semibold text-red-600">{count} spam</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Severity Dağılımı</h3>
                <div className="grid grid-cols-10 gap-1">
                  {[...Array(10)].map((_, i) => {
                    const severityCount = patterns.filter(p => p.severity === i + 1).length
                    const height = severityCount > 0 ? Math.max(20, severityCount * 20) : 10
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div 
                          className={`w-full ${
                            i >= 7 ? 'bg-red-500' : i >= 4 ? 'bg-orange-500' : 'bg-yellow-500'
                          } rounded-t`}
                          style={{ height: `${height}px` }}
                        />
                        <span className="text-xs text-gray-600 mt-1">{i + 1}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPattern ? 'Spam Pattern Düzenle' : 'Yeni Spam Pattern Ekle'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pattern Adı
                  </label>
                  <input
                    type="text"
                    value={formData.pattern_name}
                    onChange={(e) => setFormData({ ...formData, pattern_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pattern Tipi
                  </label>
                  <select
                    value={formData.pattern_type}
                    onChange={(e) => setFormData({ ...formData, pattern_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="keyword">Keyword</option>
                    <option value="email_domain">Email Domain</option>
                    <option value="url_pattern">URL Pattern</option>
                    <option value="content_hash">Content Hash</option>
                    <option value="behavior">Behavior</option>
                    <option value="regex">Regular Expression</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) })}
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
                    <option value="log_only">Sadece Logla</option>
                    <option value="flag">İşaretle</option>
                    <option value="quarantine">Karantina</option>
                    <option value="block">Engelle</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="pharmacy, casino, adult..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_regex}
                      onChange={(e) => setFormData({ ...formData, is_regex: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Regular Expression</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Aktif</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pattern Değeri
                </label>
                <textarea
                  value={formData.pattern_value}
                  onChange={(e) => setFormData({ ...formData, pattern_value: e.target.value })}
                  rows={4}
                  placeholder={
                    formData.pattern_type === 'keyword' ? 'viagra|cialis|casino|poker' :
                    formData.pattern_type === 'email_domain' ? 'tempmail.com|guerrillamail.com' :
                    formData.pattern_type === 'url_pattern' ? 'bit.ly|tinyurl.com' :
                    formData.pattern_type === 'regex' ? '[а-яА-Я]{10,}' :
                    'Pattern değerini girin...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.pattern_type === 'keyword' && 'Birden fazla keyword için | ile ayırın'}
                  {formData.pattern_type === 'regex' && 'Geçerli bir regular expression girin'}
                  {formData.pattern_type === 'behavior' && 'Örnek: url_count > 3, length > 1000'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Bu pattern'in ne yaptığını açıklayın..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingPattern(null)
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
                  {editingPattern ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}