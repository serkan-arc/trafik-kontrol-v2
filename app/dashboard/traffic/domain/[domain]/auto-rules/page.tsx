'use client'

import { useState, useEffect, use } from 'react'
import { 
  Shield, AlertTriangle, Bot, Brain, Activity,
  Settings, TrendingUp, Clock, Filter, CheckCircle,
  XCircle, AlertOctagon, Zap, BarChart, Globe
} from 'lucide-react'

interface AutoRule {
  id: number
  rule_name: string
  rule_type: 'bot_detection' | 'spam_prevention' | 'rate_limit' | 'geo_block' | 'security'
  condition: string
  action: 'block' | 'flag' | 'monitor' | 'challenge'
  threshold: number
  time_window: number
  enabled: boolean
  priority: number
  hits: number
  last_triggered?: string
  created_at: string
}

interface RuleTemplate {
  id: string
  name: string
  description: string
  icon: any
  type: AutoRule['rule_type']
  config: Partial<AutoRule>
}

export default function AutoRulesPage({ 
  params 
}: { 
  params: Promise<{ domain: string }> 
}) {
  const resolvedParams = use(params)
  const domain = resolvedParams.domain
  
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'templates' | 'logs'>('overview')
  const [rules, setRules] = useState<AutoRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddRule, setShowAddRule] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null)
  const [stats, setStats] = useState({
    total_rules: 0,
    active_rules: 0,
    triggered_today: 0,
    blocked_today: 0,
    effectiveness_rate: 0
  })

  // Rule templates
  const ruleTemplates: RuleTemplate[] = [
    {
      id: 'aggressive_bot',
      name: 'Agresif Bot Tespiti',
      description: '1 dakikada 100+ istek yapan botları engelle',
      icon: Bot,
      type: 'bot_detection',
      config: {
        rule_type: 'bot_detection',
        condition: 'requests_per_minute > 100',
        action: 'block',
        threshold: 100,
        time_window: 60,
        priority: 10
      }
    },
    {
      id: 'spam_form',
      name: 'Form Spam Koruması',
      description: 'Aynı IP\'den 5 dakikada 3+ form gönderimini engelle',
      icon: AlertTriangle,
      type: 'spam_prevention',
      config: {
        rule_type: 'spam_prevention',
        condition: 'form_submissions > 3',
        action: 'block',
        threshold: 3,
        time_window: 300,
        priority: 20
      }
    },
    {
      id: 'ddos_protection',
      name: 'DDoS Koruması',
      description: '10 saniyede 50+ istek yapan IP\'leri engelle',
      icon: Shield,
      type: 'rate_limit',
      config: {
        rule_type: 'rate_limit',
        condition: 'requests_per_second > 5',
        action: 'block',
        threshold: 50,
        time_window: 10,
        priority: 1
      }
    },
    {
      id: 'suspicious_country',
      name: 'Şüpheli Ülke Engelleme',
      description: 'Yüksek riskli ülkelerden gelen trafiği izle',
      icon: Globe,
      type: 'geo_block',
      config: {
        rule_type: 'geo_block',
        condition: 'country_risk_score > 80',
        action: 'monitor',
        threshold: 80,
        time_window: 0,
        priority: 30
      }
    },
    {
      id: 'brute_force',
      name: 'Brute Force Koruması',
      description: 'Başarısız login denemelerini engelle',
      icon: AlertOctagon,
      type: 'security',
      config: {
        rule_type: 'security',
        condition: 'failed_logins > 5',
        action: 'block',
        threshold: 5,
        time_window: 600,
        priority: 5
      }
    },
    {
      id: 'crawler_control',
      name: 'Crawler Kontrolü',
      description: 'Agresif web crawler\'ları yavaşlat',
      icon: Activity,
      type: 'bot_detection',
      config: {
        rule_type: 'bot_detection',
        condition: 'crawler_speed > 10_pages_per_minute',
        action: 'challenge',
        threshold: 10,
        time_window: 60,
        priority: 40
      }
    }
  ]

  useEffect(() => {
    fetchRules()
    const interval = setInterval(fetchRules, 30000)
    return () => clearInterval(interval)
  }, [domain])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/auto-rules`)
      const data = await response.json()
      
      if (data.success) {
        setRules(data.rules || [])
        setStats(data.statistics || stats)
      }
    } catch (error) {
      console.error('Error fetching auto rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/auto-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_name: formData.get('rule_name'),
          rule_type: formData.get('rule_type'),
          condition: formData.get('condition'),
          action: formData.get('action'),
          threshold: parseInt(formData.get('threshold') as string),
          time_window: parseInt(formData.get('time_window') as string),
          priority: parseInt(formData.get('priority') as string) || 50,
          enabled: true
        })
      })
      
      const data = await response.json()
      if (data.success) {
        await fetchRules()
        setShowAddRule(false)
        e.currentTarget.reset()
      }
    } catch (error) {
      console.error('Error adding rule:', error)
    }
  }

  const applyTemplate = (template: RuleTemplate) => {
    setSelectedTemplate(template)
    setShowAddRule(true)
  }

  const toggleRule = async (ruleId: number, enabled: boolean) => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/auto-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      
      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  const deleteRule = async (ruleId: number) => {
    if (!confirm('Bu kuralı silmek istediğinizden emin misiniz?')) return
    
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/auto-rules/${ruleId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'bot_detection': return <Bot className="w-4 h-4" />
      case 'spam_prevention': return <AlertTriangle className="w-4 h-4" />
      case 'rate_limit': return <Zap className="w-4 h-4" />
      case 'geo_block': return <Globe className="w-4 h-4" />
      case 'security': return <Shield className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'bot_detection': return 'bg-purple-100 text-purple-700'
      case 'spam_prevention': return 'bg-yellow-100 text-yellow-700'
      case 'rate_limit': return 'bg-blue-100 text-blue-700'
      case 'geo_block': return 'bg-green-100 text-green-700'
      case 'security': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Otomatik Kurallar</h1>
            <p className="text-gray-600">
              {domain} - Akıllı trafik yönetimi ve otomatik koruma
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Settings className="w-6 h-6 text-gray-500" />
            <span className="text-2xl font-bold">{stats.total_rules}</span>
          </div>
          <p className="text-sm text-gray-600">Toplam Kural</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-2xl font-bold">{stats.active_rules}</span>
          </div>
          <p className="text-sm text-gray-600">Aktif Kural</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-blue-500" />
            <span className="text-2xl font-bold">{stats.triggered_today}</span>
          </div>
          <p className="text-sm text-gray-600">Bugün Tetiklenen</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-6 h-6 text-red-500" />
            <span className="text-2xl font-bold">{stats.blocked_today}</span>
          </div>
          <p className="text-sm text-gray-600">Bugün Engellenen</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-purple-500" />
            <span className="text-2xl font-bold">{stats.effectiveness_rate}%</span>
          </div>
          <p className="text-sm text-gray-600">Etkinlik Oranı</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: BarChart },
            { id: 'rules', label: 'Kurallar', icon: Settings },
            { id: 'templates', label: 'Şablonlar', icon: Brain },
            { id: 'logs', label: 'Loglar', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
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
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold mb-4">En Aktif Kurallar</h3>
              <div className="space-y-3">
                {rules
                  .sort((a, b) => b.hits - a.hits)
                  .slice(0, 5)
                  .map(rule => (
                    <div key={rule.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRuleTypeIcon(rule.rule_type)}
                        <span className="font-medium">{rule.rule_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {rule.hits} tetikleme
                        </span>
                        {rule.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold mb-4">Kural Tipi Dağılımı</h3>
              <div className="space-y-3">
                {['bot_detection', 'spam_prevention', 'rate_limit', 'geo_block', 'security'].map(type => {
                  const count = rules.filter(r => r.rule_type === type).length
                  const percentage = rules.length > 0 ? (count / rules.length) * 100 : 0
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRuleTypeIcon(type)}
                        <span className="text-sm">
                          {type === 'bot_detection' ? 'Bot Tespiti' :
                           type === 'spam_prevention' ? 'Spam Önleme' :
                           type === 'rate_limit' ? 'Hız Limiti' :
                           type === 'geo_block' ? 'Coğrafi Engel' : 'Güvenlik'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 ml-4">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-10">{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b">
              <button
                onClick={() => setShowAddRule(!showAddRule)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                + Yeni Kural Ekle
              </button>
            </div>

            {showAddRule && (
              <form onSubmit={handleAddRule} className="p-4 bg-gray-50 border-b">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="rule_name"
                    defaultValue={selectedTemplate?.config.rule_name}
                    placeholder="Kural Adı"
                    required
                    className="px-3 py-2 border rounded-lg"
                  />
                  
                  <select
                    name="rule_type"
                    defaultValue={selectedTemplate?.config.rule_type}
                    required
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="bot_detection">Bot Tespiti</option>
                    <option value="spam_prevention">Spam Önleme</option>
                    <option value="rate_limit">Hız Limiti</option>
                    <option value="geo_block">Coğrafi Engel</option>
                    <option value="security">Güvenlik</option>
                  </select>
                  
                  <input
                    type="text"
                    name="condition"
                    defaultValue={selectedTemplate?.config.condition}
                    placeholder="Koşul (örn: requests > 100)"
                    required
                    className="px-3 py-2 border rounded-lg"
                  />
                  
                  <select
                    name="action"
                    defaultValue={selectedTemplate?.config.action}
                    required
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="block">Engelle</option>
                    <option value="flag">İşaretle</option>
                    <option value="monitor">İzle</option>
                    <option value="challenge">Challenge</option>
                  </select>
                  
                  <input
                    type="number"
                    name="threshold"
                    defaultValue={selectedTemplate?.config.threshold}
                    placeholder="Eşik Değeri"
                    required
                    className="px-3 py-2 border rounded-lg"
                  />
                  
                  <input
                    type="number"
                    name="time_window"
                    defaultValue={selectedTemplate?.config.time_window}
                    placeholder="Zaman Penceresi (saniye)"
                    required
                    className="px-3 py-2 border rounded-lg"
                  />
                  
                  <input
                    type="number"
                    name="priority"
                    defaultValue={selectedTemplate?.config.priority || 50}
                    placeholder="Öncelik (1-100)"
                    className="px-3 py-2 border rounded-lg"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRule(false)
                        setSelectedTemplate(null)
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Kural</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Tip</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Koşul</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Aksiyon</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Tetikleme</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Durum</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{rule.rule_name}</div>
                        <div className="text-xs text-gray-500">
                          Öncelik: {rule.priority}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit ${getRuleTypeColor(rule.rule_type)}`}>
                          {getRuleTypeIcon(rule.rule_type)}
                          {rule.rule_type === 'bot_detection' ? 'Bot' :
                           rule.rule_type === 'spam_prevention' ? 'Spam' :
                           rule.rule_type === 'rate_limit' ? 'Hız' :
                           rule.rule_type === 'geo_block' ? 'Geo' : 'Güvenlik'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {rule.condition}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${
                          rule.action === 'block' ? 'text-red-600' :
                          rule.action === 'flag' ? 'text-yellow-600' :
                          rule.action === 'monitor' ? 'text-blue-600' :
                          'text-purple-600'
                        }`}>
                          {rule.action === 'block' ? 'Engelle' :
                           rule.action === 'flag' ? 'İşaretle' :
                           rule.action === 'monitor' ? 'İzle' : 'Challenge'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{rule.hits} kez</div>
                        {rule.last_triggered && (
                          <div className="text-xs text-gray-500">
                            Son: {new Date(rule.last_triggered).toLocaleTimeString('tr-TR')}
                          </div>
                        )}
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
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ruleTemplates.map(template => (
              <div key={template.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <template.icon className="w-8 h-8 text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold">{template.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Aksiyon:</span>
                    <span className="font-medium">
                      {template.config.action === 'block' ? 'Engelle' :
                       template.config.action === 'monitor' ? 'İzle' :
                       template.config.action === 'challenge' ? 'Challenge' : 'İşaretle'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Eşik:</span>
                    <span className="font-medium">{template.config.threshold}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Pencere:</span>
                    <span className="font-medium">{template.config.time_window}s</span>
                  </div>
                </div>
                
                <button
                  onClick={() => applyTemplate(template)}
                  className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Şablonu Uygula
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Kural Logları
              </h3>
              <p className="text-gray-500">
                Otomatik kuralların tetiklenme logları burada görüntülenecek.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}