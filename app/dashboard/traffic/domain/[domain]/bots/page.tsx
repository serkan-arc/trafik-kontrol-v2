'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface BotPattern {
  id: string
  bot_name: string
  bot_type: 'good' | 'bad' | 'unknown'
  category: string
  user_agent_patterns: string[]
  recommended_action: string
  vendor: string
  description: string
  verified: boolean
  detection_count: number
  enabled: boolean
  created_at: string
}

interface BotDetection {
  id: string
  ip_address: string
  user_agent: string
  bot_name: string
  bot_type: string
  detection_method: string
  is_fake: boolean
  confidence_score: number
  action_taken: string
  blocked: boolean
  created_at: string
}

export default function DomainBotManagement({ params }: { params: Promise<{ domain: string }> }) {
  const resolvedParams = use(params)
  const domain = resolvedParams.domain
  
  const [patterns, setPatterns] = useState<BotPattern[]>([])
  const [detections, setDetections] = useState<BotDetection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('patterns')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<BotPattern | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    bot_name: '',
    bot_type: 'unknown' as 'good' | 'bad' | 'unknown',
    category: '',
    user_agent_patterns: '',
    recommended_action: 'monitor',
    vendor: '',
    description: '',
    verified: false
  })

  // Fetch bot patterns
  const fetchPatterns = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/bot-patterns`)
      const data = await response.json()
      if (data.success) {
        setPatterns(data.patterns)
      }
    } catch (error) {
      console.error('Error fetching bot patterns:', error)
    }
  }

  // Fetch bot detections
  const fetchDetections = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/bot-detections`)
      const data = await response.json()
      if (data.success) {
        setDetections(data.detections)
      }
    } catch (error) {
      console.error('Error fetching bot detections:', error)
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

  // Add/Update bot pattern
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const patternData = {
      ...formData,
      user_agent_patterns: formData.user_agent_patterns.split('\n').filter(p => p.trim())
    }
    
    try {
      const url = editingPattern 
        ? `/api/traffic/domains/${domain}/bot-patterns/${editingPattern.id}`
        : `/api/traffic/domains/${domain}/bot-patterns`
      
      const response = await fetch(url, {
        method: editingPattern ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patternData)
      })
      
      if (response.ok) {
        await fetchPatterns()
        setShowAddModal(false)
        setEditingPattern(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving bot pattern:', error)
    }
  }

  // Delete bot pattern
  const handleDelete = async (patternId: string) => {
    if (!confirm('Bu bot pattern\'i silmek istediğinizden emin misiniz?')) return
    
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/bot-patterns/${patternId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchPatterns()
      }
    } catch (error) {
      console.error('Error deleting bot pattern:', error)
    }
  }

  // Toggle pattern enabled/disabled
  const handleToggle = async (patternId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/bot-patterns/${patternId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      
      if (response.ok) {
        await fetchPatterns()
      }
    } catch (error) {
      console.error('Error toggling bot pattern:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      bot_name: '',
      bot_type: 'unknown',
      category: '',
      user_agent_patterns: '',
      recommended_action: 'monitor',
      vendor: '',
      description: '',
      verified: false
    })
  }

  const openEditModal = (pattern: BotPattern) => {
    setEditingPattern(pattern)
    setFormData({
      bot_name: pattern.bot_name,
      bot_type: pattern.bot_type,
      category: pattern.category,
      user_agent_patterns: pattern.user_agent_patterns.join('\n'),
      recommended_action: pattern.recommended_action,
      vendor: pattern.vendor,
      description: pattern.description,
      verified: pattern.verified
    })
    setShowAddModal(true)
  }

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
    good_bots: patterns.filter(p => p.bot_type === 'good').length,
    bad_bots: patterns.filter(p => p.bot_type === 'bad').length,
    total_detections: detections.length,
    blocked_detections: detections.filter(d => d.blocked).length
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
              <span className="text-gray-900 font-semibold">Bot Detection</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">🤖 Bot Detection & Management</h1>
            <p className="text-sm text-gray-600 mt-1">Domain-specific bot patterns ve detection yönetimi</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingPattern(null)
              setShowAddModal(true)
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Yeni Pattern Ekle
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Toplam Pattern</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total_patterns}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Aktif</p>
          <p className="text-2xl font-bold text-green-600">{stats.enabled_patterns}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">İyi Bot</p>
          <p className="text-2xl font-bold text-blue-600">{stats.good_bots}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Kötü Bot</p>
          <p className="text-2xl font-bold text-red-600">{stats.bad_bots}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Tespit</p>
          <p className="text-2xl font-bold text-purple-600">{stats.total_detections}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600">Engellenen</p>
          <p className="text-2xl font-bold text-orange-600">{stats.blocked_detections}</p>
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
              Bot Patterns ({patterns.length})
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
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'patterns' && (
            <div className="space-y-4">
              {patterns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Henüz bot pattern eklenmemiş. Yeni pattern ekleyerek başlayın.
                </p>
              ) : (
                patterns.map((pattern) => (
                  <div key={pattern.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{pattern.bot_name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            pattern.bot_type === 'good' 
                              ? 'bg-green-100 text-green-800'
                              : pattern.bot_type === 'bad'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {pattern.bot_type}
                          </span>
                          <span className="text-xs text-gray-500">{pattern.category}</span>
                          {pattern.verified && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Vendor: {pattern.vendor || 'N/A'}</span>
                          <span>Action: {pattern.recommended_action}</span>
                          <span>Detections: {pattern.detection_count}</span>
                          <span>Patterns: {pattern.user_agent_patterns.length}</span>
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
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Bot Name</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Confidence</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Action</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {detections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        Henüz bot tespiti yapılmamış.
                      </td>
                    </tr>
                  ) : (
                    detections.map((detection) => (
                      <tr key={detection.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 text-sm font-mono">{detection.ip_address}</td>
                        <td className="py-2 px-3 text-sm">{detection.bot_name}</td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            detection.bot_type === 'good'
                              ? 'bg-green-100 text-green-700'
                              : detection.bot_type === 'bad'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {detection.bot_type}
                            {detection.is_fake && ' (FAKE)'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {Math.round(detection.confidence_score * 100)}%
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            detection.blocked
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {detection.action_taken}
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
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPattern ? 'Bot Pattern Düzenle' : 'Yeni Bot Pattern Ekle'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bot Adı
                  </label>
                  <input
                    type="text"
                    value={formData.bot_name}
                    onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bot Tipi
                  </label>
                  <select
                    value={formData.bot_type}
                    onChange={(e) => setFormData({ ...formData, bot_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="good">İyi Bot</option>
                    <option value="bad">Kötü Bot</option>
                    <option value="unknown">Bilinmeyen</option>
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
                    placeholder="search_engine, scraper, monitoring..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Önerilen Aksiyon
                  </label>
                  <select
                    value={formData.recommended_action}
                    onChange={(e) => setFormData({ ...formData, recommended_action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="allow">İzin Ver</option>
                    <option value="monitor">İzle</option>
                    <option value="challenge">Challenge</option>
                    <option value="block">Engelle</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Google, Microsoft, Meta..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={formData.verified}
                    onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="verified" className="text-sm text-gray-700">
                    Doğrulanmış Bot
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Agent Patterns (her satıra bir pattern)
                </label>
                <textarea
                  value={formData.user_agent_patterns}
                  onChange={(e) => setFormData({ ...formData, user_agent_patterns: e.target.value })}
                  rows={4}
                  placeholder="Googlebot&#10;Bingbot&#10;facebookexternalhit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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