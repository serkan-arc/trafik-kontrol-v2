'use client'

import { useState, useEffect } from 'react'

interface BotPattern {
  id: string
  bot_name: string
  bot_type: 'good' | 'bad' | 'unknown'
  category: string
  user_agent_patterns: string[]
  ip_ranges: string[] | null
  behavior_signatures: any
  recommended_action: string
  vendor: string
  description: string
  verified: boolean
  detection_count: number
  last_detected_at: string | null
  enabled: boolean
  created_at: string
}

interface Detection {
  id: string
  ip: string
  domain: string
  user_agent: string
  is_bot: boolean
  bot_name: string
  bot_type: string
  bot_score: number
  detection_method: string
  action: string
  blocked: boolean
  detected_at: string
}

interface Statistics {
  total_patterns: number
  good_bots: number
  bad_bots: number
  verified_patterns: number
  enabled_patterns: number
}

interface DetectionStats {
  total_detections: number
  confirmed_bots: number
  good_bots: number
  bad_bots: number
  blocked_count: number
  avg_bot_score: number
}

export default function BotDetectionPage() {
  const [patterns, setPatterns] = useState<BotPattern[]>([])
  const [detections, setDetections] = useState<Detection[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [detectionStats, setDetectionStats] = useState<DetectionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'patterns' | 'detections'>('patterns')
  
  // Filters
  const [botTypeFilter, setBotTypeFilter] = useState<string>('')
  const [enabledFilter, setEnabledFilter] = useState<string>('')
  
  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<BotPattern | null>(null)
  const [formData, setFormData] = useState({
    bot_name: '',
    bot_type: 'bad',
    category: '',
    user_agent_patterns: '',
    ip_ranges: '',
    recommended_action: 'block',
    vendor: '',
    description: '',
    verified: false
  })

  useEffect(() => {
    fetchData()
  }, [botTypeFilter, enabledFilter])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchPatterns(), fetchDetections()])
    setLoading(false)
  }

  const fetchPatterns = async () => {
    try {
      const params = new URLSearchParams()
      if (botTypeFilter) params.append('bot_type', botTypeFilter)
      if (enabledFilter) params.append('enabled', enabledFilter)

      const response = await fetch(`/api/global/bot-detection/patterns?${params}`)
      const data = await response.json()

      if (data.success) {
        setPatterns(data.data.patterns)
        setStatistics(data.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching patterns:', error)
    }
  }

  const fetchDetections = async () => {
    try {
      const response = await fetch('/api/global/bot-detection/detections?limit=100')
      const data = await response.json()

      if (data.success) {
        setDetections(data.data.detections)
        setDetectionStats(data.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching detections:', error)
    }
  }

  const handleCreatePattern = () => {
    setEditingPattern(null)
    setFormData({
      bot_name: '',
      bot_type: 'bad',
      category: '',
      user_agent_patterns: '',
      ip_ranges: '',
      recommended_action: 'block',
      vendor: '',
      description: '',
      verified: false
    })
    setShowModal(true)
  }

  const handleEditPattern = (pattern: BotPattern) => {
    setEditingPattern(pattern)
    setFormData({
      bot_name: pattern.bot_name,
      bot_type: pattern.bot_type,
      category: pattern.category || '',
      user_agent_patterns: pattern.user_agent_patterns.join('\n'),
      ip_ranges: pattern.ip_ranges?.join('\n') || '',
      recommended_action: pattern.recommended_action,
      vendor: pattern.vendor || '',
      description: pattern.description || '',
      verified: pattern.verified
    })
    setShowModal(true)
  }

  const handleSavePattern = async () => {
    try {
      const payload = {
        ...formData,
        user_agent_patterns: formData.user_agent_patterns.split('\n').map(p => p.trim()).filter(p => p),
        ip_ranges: formData.ip_ranges ? formData.ip_ranges.split('\n').map(p => p.trim()).filter(p => p) : null
      }

      const url = '/api/global/bot-detection/patterns'
      const method = editingPattern ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPattern ? { id: editingPattern.id, ...payload } : payload)
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        setShowModal(false)
        fetchPatterns()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving pattern:', error)
      alert('Failed to save pattern')
    }
  }

  const handleDeletePattern = async (patternId: string) => {
    if (!confirm('Delete this bot pattern?')) return

    try {
      const response = await fetch(`/api/global/bot-detection/patterns?id=${patternId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        fetchPatterns()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting pattern:', error)
    }
  }

  const handleTogglePattern = async (pattern: BotPattern) => {
    try {
      const response = await fetch('/api/global/bot-detection/patterns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pattern.id, enabled: !pattern.enabled })
      })

      const data = await response.json()

      if (data.success) {
        fetchPatterns()
      }
    } catch (error) {
      console.error('Error toggling pattern:', error)
    }
  }

  const getBotTypeColor = (type: string) => {
    const colors = {
      good: 'bg-green-100 text-green-700',
      bad: 'bg-red-100 text-red-700',
      unknown: 'bg-gray-100 text-gray-700'
    }
    return colors[type as keyof typeof colors] || colors.unknown
  }

  if (loading && patterns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🤖 Bot Detection
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage bot patterns and view detection logs
            </p>
          </div>
          <button
            onClick={handleCreatePattern}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            <span>Add Pattern</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Total Patterns</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.total_patterns}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Good Bots</p>
            <p className="text-2xl font-bold text-green-600">{statistics.good_bots}</p>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Bad Bots</p>
            <p className="text-2xl font-bold text-red-600">{statistics.bad_bots}</p>
          </div>

          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Verified</p>
            <p className="text-2xl font-bold text-blue-600">{statistics.verified_patterns}</p>
          </div>

          <div className="bg-white rounded-lg border border-indigo-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Enabled</p>
            <p className="text-2xl font-bold text-indigo-600">{statistics.enabled_patterns}</p>
          </div>
        </div>
      )}

      {/* Detection Statistics */}
      {detectionStats && activeTab === 'detections' && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Total Detections</p>
            <p className="text-2xl font-bold text-gray-900">{detectionStats.total_detections}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Confirmed</p>
            <p className="text-2xl font-bold text-yellow-600">{detectionStats.confirmed_bots}</p>
          </div>

          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Good Bots</p>
            <p className="text-2xl font-bold text-green-600">{detectionStats.good_bots}</p>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Bad Bots</p>
            <p className="text-2xl font-bold text-red-600">{detectionStats.bad_bots}</p>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Blocked</p>
            <p className="text-2xl font-bold text-red-600">{detectionStats.blocked_count}</p>
          </div>

          <div className="bg-white rounded-lg border border-purple-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Score</p>
            <p className="text-2xl font-bold text-purple-600">
              {detectionStats.avg_bot_score ? Math.round(detectionStats.avg_bot_score) : 0}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('patterns')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'patterns'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bot Patterns ({patterns.length})
            </button>
            <button
              onClick={() => setActiveTab('detections')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'detections'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Detection Logs ({detections.length})
            </button>
          </div>
        </div>

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bot Type</label>
                <select
                  value={botTypeFilter}
                  onChange={(e) => setBotTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="good">Good Bots</option>
                  <option value="bad">Bad Bots</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={enabledFilter}
                  onChange={(e) => setEnabledFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setBotTypeFilter('')
                    setEnabledFilter('')
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Patterns List */}
            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{pattern.bot_name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getBotTypeColor(pattern.bot_type)}`}>
                          {pattern.bot_type}
                        </span>
                        {pattern.verified && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            ✓ Verified
                          </span>
                        )}
                        {pattern.vendor && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {pattern.vendor}
                          </span>
                        )}
                      </div>
                      
                      {pattern.description && (
                        <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <span>Category: <span className="font-medium">{pattern.category || 'N/A'}</span></span>
                        <span>Action: <span className="font-medium">{pattern.recommended_action}</span></span>
                        <span>Detections: <span className="font-medium">{pattern.detection_count}</span></span>
                      </div>

                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Patterns:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {pattern.user_agent_patterns.slice(0, 3).map((p, i) => (
                            <span key={i} className="bg-gray-50 px-2 py-1 rounded font-mono">
                              {p}
                            </span>
                          ))}
                          {pattern.user_agent_patterns.length > 3 && (
                            <span className="text-gray-400">
                              +{pattern.user_agent_patterns.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pattern.enabled}
                          onChange={() => handleTogglePattern(pattern)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>

                      <button
                        onClick={() => handleEditPattern(pattern)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePattern(pattern.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {patterns.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">No bot patterns found</p>
                  <p className="text-sm">Add your first pattern to start detecting bots</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detections Tab */}
        {activeTab === 'detections' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Bot</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {detections.map((detection) => (
                    <tr key={detection.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{detection.ip}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{detection.domain}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{detection.bot_name || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${getBotTypeColor(detection.bot_type)}`}>
                          {detection.bot_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${
                          detection.bot_score >= 70 ? 'text-red-600' :
                          detection.bot_score >= 40 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {detection.bot_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{detection.detection_method}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(detection.detected_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {detections.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>No detections recorded yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPattern ? 'Edit Bot Pattern' : 'Add Bot Pattern'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bot Name *</label>
                  <input
                    type="text"
                    value={formData.bot_name}
                    onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Googlebot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bot Type *</label>
                  <select
                    value={formData.bot_type}
                    onChange={(e) => setFormData({ ...formData, bot_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="good">Good Bot</option>
                    <option value="bad">Bad Bot</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="search_engine, scraper, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Google, Microsoft, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User-Agent Patterns * (one per line)
                </label>
                <textarea
                  value={formData.user_agent_patterns}
                  onChange={(e) => setFormData({ ...formData, user_agent_patterns: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  rows={4}
                  placeholder="Googlebot&#10;Googlebot-Image"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Ranges (optional, one per line)
                </label>
                <textarea
                  value={formData.ip_ranges}
                  onChange={(e) => setFormData({ ...formData, ip_ranges: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  rows={2}
                  placeholder="66.249.0.0/16"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recommended Action</label>
                <select
                  value={formData.recommended_action}
                  onChange={(e) => setFormData({ ...formData, recommended_action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="allow">Allow</option>
                  <option value="monitor">Monitor</option>
                  <option value="challenge">Challenge</option>
                  <option value="block">Block</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Brief description..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="verified"
                  checked={formData.verified}
                  onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="verified" className="text-sm font-medium text-gray-700">
                  Verified Pattern
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePattern}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingPattern ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
