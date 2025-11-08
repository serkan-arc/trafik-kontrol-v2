'use client'

import { useState, useEffect } from 'react'

interface SpamPattern {
  id: string
  pattern_name: string
  pattern_type: 'keyword' | 'email_domain' | 'url_pattern' | 'content_hash' | 'behavior'
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
  source: string
  created_at: string
  updated_at: string
}

interface Detection {
  id: string
  ip: string
  domain: string
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
  detected_at: string
}

interface Statistics {
  total: number
  enabled: number
  disabled: number
  by_type: Record<string, number>
  by_severity: Record<string, number>
  total_matches: number
}

interface DetectionStatistics {
  total_detections: string
  blocked_count: string
  avg_spam_score: string
  disposable_emails: string
  with_urls: string
  unique_ips: string
  affected_domains: string
}

export default function SpamControlPage() {
  const [activeTab, setActiveTab] = useState<'patterns' | 'detections'>('patterns')
  const [patterns, setPatterns] = useState<SpamPattern[]>([])
  const [detections, setDetections] = useState<Detection[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [detectionStats, setDetectionStats] = useState<DetectionStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<SpamPattern | null>(null)
  const [formData, setFormData] = useState({
    pattern_name: '',
    pattern_type: 'keyword' as SpamPattern['pattern_type'],
    pattern_value: '',
    is_regex: false,
    severity: 5,
    category: '',
    action: 'flag' as SpamPattern['action'],
    description: '',
    source: 'manual'
  })
  
  // Filters
  const [patternTypeFilter, setPatternTypeFilter] = useState<string>('all')
  const [enabledFilter, setEnabledFilter] = useState<string>('all')
  const [minScoreFilter, setMinScoreFilter] = useState<string>('')
  const [blockedFilter, setBlockedFilter] = useState<string>('all')
  
  useEffect(() => {
    if (activeTab === 'patterns') {
      fetchPatterns()
    } else {
      fetchDetections()
    }
  }, [activeTab, patternTypeFilter, enabledFilter, minScoreFilter, blockedFilter])
  
  const fetchPatterns = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (patternTypeFilter !== 'all') params.append('pattern_type', patternTypeFilter)
      if (enabledFilter !== 'all') params.append('enabled', enabledFilter)
      
      const response = await fetch(`/api/global/spam-control/patterns?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setPatterns(data.data.patterns)
        setStatistics(data.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching patterns:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchDetections = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (minScoreFilter) params.append('min_score', minScoreFilter)
      if (blockedFilter !== 'all') params.append('blocked', blockedFilter)
      
      const response = await fetch(`/api/global/spam-control/detections?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setDetections(data.data.detections)
        setDetectionStats(data.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching detections:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreatePattern = () => {
    setEditingPattern(null)
    setFormData({
      pattern_name: '',
      pattern_type: 'keyword',
      pattern_value: '',
      is_regex: false,
      severity: 5,
      category: '',
      action: 'flag',
      description: '',
      source: 'manual'
    })
    setShowModal(true)
  }
  
  const handleEditPattern = (pattern: SpamPattern) => {
    setEditingPattern(pattern)
    setFormData({
      pattern_name: pattern.pattern_name,
      pattern_type: pattern.pattern_type,
      pattern_value: pattern.pattern_value,
      is_regex: pattern.is_regex,
      severity: pattern.severity,
      category: pattern.category || '',
      action: pattern.action,
      description: pattern.description || '',
      source: pattern.source
    })
    setShowModal(true)
  }
  
  const handleSavePattern = async () => {
    try {
      const url = editingPattern
        ? '/api/global/spam-control/patterns'
        : '/api/global/spam-control/patterns'
      
      const method = editingPattern ? 'PUT' : 'POST'
      const body = editingPattern
        ? { id: editingPattern.id, ...formData }
        : formData
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowModal(false)
        fetchPatterns()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving pattern:', error)
      alert('Error saving pattern')
    }
  }
  
  const handleDeletePattern = async (patternId: string) => {
    if (!confirm('Are you sure you want to delete this pattern?')) return
    
    try {
      const response = await fetch(`/api/global/spam-control/patterns?id=${patternId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchPatterns()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting pattern:', error)
      alert('Error deleting pattern')
    }
  }
  
  const handleTogglePattern = async (pattern: SpamPattern) => {
    try {
      const response = await fetch('/api/global/spam-control/patterns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pattern.id,
          enabled: !pattern.enabled
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchPatterns()
      }
    } catch (error) {
      console.error('Error toggling pattern:', error)
    }
  }
  
  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'text-red-600 bg-red-50'
    if (severity >= 4) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }
  
  const getSeverityLabel = (severity: number) => {
    if (severity >= 7) return 'High'
    if (severity >= 4) return 'Medium'
    return 'Low'
  }
  
  const getActionColor = (action: string) => {
    switch (action) {
      case 'block': return 'text-red-600 bg-red-50'
      case 'quarantine': return 'text-orange-600 bg-orange-50'
      case 'flag': return 'text-yellow-600 bg-yellow-50'
      case 'log_only': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }
  
  const getPatternTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      keyword: 'Keyword',
      email_domain: 'Email Domain',
      url_pattern: 'URL Pattern',
      content_hash: 'Content Hash',
      behavior: 'Behavior'
    }
    return labels[type] || type
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🚫 Spam Control</h1>
        <p className="text-gray-600 mt-1">Manage spam patterns and detection logs</p>
      </div>
      
      {/* Statistics Cards */}
      {activeTab === 'patterns' && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Patterns</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.enabled} enabled, {statistics.disabled} disabled
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">By Severity</div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-600">
                High: {statistics.by_severity.high || 0}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-600">
                Med: {statistics.by_severity.medium || 0}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-600">
                Low: {statistics.by_severity.low || 0}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Matches</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.total_matches.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">All time detections</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Pattern Types</div>
            <div className="text-xs text-gray-600 mt-1">
              {Object.entries(statistics.by_type).map(([type, count]) => (
                <div key={type}>{getPatternTypeLabel(type)}: {count}</div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'detections' && detectionStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">24h Detections</div>
            <div className="text-2xl font-bold text-gray-900">{parseInt(detectionStats.total_detections).toLocaleString()}</div>
            <div className="text-xs text-red-600 mt-1">{detectionStats.blocked_count} blocked</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Avg Spam Score</div>
            <div className="text-2xl font-bold text-gray-900">{parseFloat(detectionStats.avg_spam_score || '0').toFixed(1)}</div>
            <div className="text-xs text-gray-500 mt-1">Out of 100</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Disposable Emails</div>
            <div className="text-2xl font-bold text-orange-600">{detectionStats.disposable_emails}</div>
            <div className="text-xs text-gray-500 mt-1">Temp email services</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Unique IPs</div>
            <div className="text-2xl font-bold text-gray-900">{detectionStats.unique_ips}</div>
            <div className="text-xs text-gray-500 mt-1">{detectionStats.affected_domains} domains</div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'patterns'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🎯 Spam Patterns ({patterns.length})
          </button>
          <button
            onClick={() => setActiveTab('detections')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'detections'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📋 Detection Logs ({detections.length})
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'patterns' ? (
            <>
              {/* Patterns Toolbar */}
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div className="flex gap-2">
                  <select
                    value={patternTypeFilter}
                    onChange={(e) => setPatternTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="keyword">Keyword</option>
                    <option value="email_domain">Email Domain</option>
                    <option value="url_pattern">URL Pattern</option>
                    <option value="content_hash">Content Hash</option>
                    <option value="behavior">Behavior</option>
                  </select>
                  
                  <select
                    value={enabledFilter}
                    onChange={(e) => setEnabledFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                
                <button
                  onClick={handleCreatePattern}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  + Add Pattern
                </button>
              </div>
              
              {/* Patterns List */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pattern</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Matches</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          Loading patterns...
                        </td>
                      </tr>
                    ) : patterns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No spam patterns found. Create your first pattern to get started.
                        </td>
                      </tr>
                    ) : (
                      patterns.map((pattern) => (
                        <tr key={pattern.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{pattern.pattern_name}</div>
                            {pattern.category && (
                              <div className="text-xs text-gray-500">{pattern.category}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {getPatternTypeLabel(pattern.pattern_type)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {pattern.pattern_value.length > 40
                                ? pattern.pattern_value.substring(0, 40) + '...'
                                : pattern.pattern_value}
                            </code>
                            {pattern.is_regex && (
                              <span className="ml-2 text-xs text-purple-600">regex</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded font-medium ${getSeverityColor(pattern.severity)}`}>
                              {getSeverityLabel(pattern.severity)} ({pattern.severity})
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded font-medium ${getActionColor(pattern.action)}`}>
                              {pattern.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{pattern.matches_count.toLocaleString()}</div>
                            {pattern.false_positive_count > 0 && (
                              <div className="text-xs text-orange-600">
                                {pattern.false_positive_count} false+
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pattern.enabled}
                                onChange={() => handleTogglePattern(pattern)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditPattern(pattern)}
                                className="text-indigo-600 hover:text-indigo-900 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePattern(pattern.id)}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* Detections Toolbar */}
              <div className="flex flex-wrap gap-4 items-center mb-4">
                <input
                  type="number"
                  placeholder="Min spam score"
                  value={minScoreFilter}
                  onChange={(e) => setMinScoreFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  min="0"
                  max="100"
                />
                
                <select
                  value={blockedFilter}
                  onChange={(e) => setBlockedFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Actions</option>
                  <option value="true">Blocked Only</option>
                  <option value="false">Not Blocked</option>
                </select>
              </div>
              
              {/* Detections List */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">IP</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Domain</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Form Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Spam Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Patterns</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          Loading detections...
                        </td>
                      </tr>
                    ) : detections.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No spam detections found.
                        </td>
                      </tr>
                    ) : (
                      detections.map((detection) => (
                        <tr key={detection.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{detection.ip}</code>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{detection.domain}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{detection.form_type || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-bold ${
                              detection.spam_score >= 70 ? 'text-red-600' :
                              detection.spam_score >= 40 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {detection.spam_score}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{detection.email || '-'}</div>
                            {detection.email_is_disposable && (
                              <span className="text-xs text-orange-600">⚠️ Disposable</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600">
                              {detection.matched_patterns && detection.matched_patterns.length > 0 ? (
                                <div className="space-y-1">
                                  {detection.matched_patterns.slice(0, 2).map((p, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                      <span className={`px-1 py-0.5 rounded ${getSeverityColor(p.severity)}`}>
                                        {p.pattern_name}
                                      </span>
                                    </div>
                                  ))}
                                  {detection.matched_patterns.length > 2 && (
                                    <div className="text-gray-500">+{detection.matched_patterns.length - 2} more</div>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {detection.blocked ? (
                              <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 font-medium">
                                🚫 Blocked
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-600 font-medium">
                                ⚠️ Flagged
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-500">
                              {new Date(detection.detected_at).toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPattern ? 'Edit Spam Pattern' : 'Create Spam Pattern'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pattern Name *
                </label>
                <input
                  type="text"
                  value={formData.pattern_name}
                  onChange={(e) => setFormData({ ...formData, pattern_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Viagra Keyword"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pattern Type *
                  </label>
                  <select
                    value={formData.pattern_type}
                    onChange={(e) => setFormData({ ...formData, pattern_type: e.target.value as SpamPattern['pattern_type'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="keyword">Keyword</option>
                    <option value="email_domain">Email Domain</option>
                    <option value="url_pattern">URL Pattern</option>
                    <option value="content_hash">Content Hash</option>
                    <option value="behavior">Behavior</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., pharmaceutical"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pattern Value *
                </label>
                <textarea
                  value={formData.pattern_value}
                  onChange={(e) => setFormData({ ...formData, pattern_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="e.g., viagra|cialis|pharmacy"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_regex"
                  checked={formData.is_regex}
                  onChange={(e) => setFormData({ ...formData, is_regex: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="is_regex" className="text-sm text-gray-700">
                  Use as Regular Expression
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity (1-10) *
                  </label>
                  <input
                    type="number"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="10"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    1-3: Low, 4-6: Medium, 7-10: High
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action *
                  </label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value as SpamPattern['action'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="flag">Flag</option>
                    <option value="block">Block</option>
                    <option value="quarantine">Quarantine</option>
                    <option value="log_only">Log Only</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Optional description of this pattern"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePattern}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingPattern ? 'Save Changes' : 'Create Pattern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
