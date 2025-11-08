'use client'

import { useState, useEffect } from 'react'

interface NotificationChannel {
  id: string
  channel_name: string
  channel_type: 'email' | 'slack' | 'webhook' | 'telegram' | 'sms'
  config: any
  enabled: boolean
  total_sent: number
  total_failed: number
  last_sent_at: string | null
  last_test_at: string | null
  last_test_status: string | null
  created_at: string
}

interface NotificationRule {
  id: string
  rule_name: string
  description: string
  event_types: string[]
  min_severity: 'low' | 'medium' | 'high' | 'critical'
  affected_domains: string[]
  throttle_enabled: boolean
  throttle_window_minutes: number
  throttle_max_per_window: number
  recipient_emails: string[]
  channel_ids: string[]
  priority: number
  enabled: boolean
  triggered_count: number
  last_triggered_at: string | null
  created_at: string
}

interface NotificationHistory {
  id: string
  rule_name: string
  channel_name: string
  channel_type: string
  event_type: string
  severity: string
  subject: string
  recipient: string
  status: 'pending' | 'sent' | 'failed' | 'throttled'
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'channels' | 'rules' | 'history'>('channels')
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [history, setHistory] = useState<NotificationHistory[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Modal states
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null)
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null)
  
  // Form data for channel
  const [channelFormData, setChannelFormData] = useState({
    channel_name: '',
    channel_type: 'email' as NotificationChannel['channel_type'],
    config: {
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: '',
      from_email: '',
      from_name: ''
    },
    enabled: true
  })
  
  // Form data for rule
  const [ruleFormData, setRuleFormData] = useState({
    rule_name: '',
    description: '',
    event_types: [] as string[],
    min_severity: 'medium' as NotificationRule['min_severity'],
    affected_domains: [] as string[],
    throttle_enabled: true,
    throttle_window_minutes: 60,
    throttle_max_per_window: 5,
    recipient_emails: [] as string[],
    channel_ids: [] as string[],
    priority: 0,
    enabled: true
  })
  
  useEffect(() => {
    if (activeTab === 'channels') {
      fetchChannels()
    } else if (activeTab === 'rules') {
      fetchRules()
    } else if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab])
  
  const fetchChannels = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/channels')
      const data = await response.json()
      if (data.success) {
        setChannels(data.data)
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchRules = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/rules')
      const data = await response.json()
      if (data.success) {
        setRules(data.data)
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/history')
      const data = await response.json()
      if (data.success) {
        setHistory(data.data.notifications)
        setStatistics(data.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateChannel = () => {
    setEditingChannel(null)
    setChannelFormData({
      channel_name: '',
      channel_type: 'email',
      config: {
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_password: '',
        from_email: '',
        from_name: ''
      },
      enabled: true
    })
    setShowChannelModal(true)
  }
  
  const handleEditChannel = (channel: NotificationChannel) => {
    setEditingChannel(channel)
    setChannelFormData({
      channel_name: channel.channel_name,
      channel_type: channel.channel_type,
      config: channel.config,
      enabled: channel.enabled
    })
    setShowChannelModal(true)
  }
  
  const handleSaveChannel = async () => {
    try {
      const url = '/api/notifications/channels'
      const method = editingChannel ? 'PUT' : 'POST'
      const body = editingChannel
        ? { id: editingChannel.id, ...channelFormData }
        : channelFormData
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowChannelModal(false)
        fetchChannels()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving channel:', error)
      alert('Error saving channel')
    }
  }
  
  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return
    
    try {
      const response = await fetch(`/api/notifications/channels?id=${channelId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchChannels()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting channel:', error)
      alert('Error deleting channel')
    }
  }
  
  const handleToggleChannel = async (channel: NotificationChannel) => {
    try {
      const response = await fetch('/api/notifications/channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: channel.id,
          enabled: !channel.enabled
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchChannels()
      }
    } catch (error) {
      console.error('Error toggling channel:', error)
    }
  }
  
  const handleCreateRule = () => {
    setEditingRule(null)
    setRuleFormData({
      rule_name: '',
      description: '',
      event_types: [],
      min_severity: 'medium',
      affected_domains: [],
      throttle_enabled: true,
      throttle_window_minutes: 60,
      throttle_max_per_window: 5,
      recipient_emails: [],
      channel_ids: [],
      priority: 0,
      enabled: true
    })
    setShowRuleModal(true)
  }
  
  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule)
    setRuleFormData({
      rule_name: rule.rule_name,
      description: rule.description,
      event_types: rule.event_types,
      min_severity: rule.min_severity,
      affected_domains: rule.affected_domains,
      throttle_enabled: rule.throttle_enabled,
      throttle_window_minutes: rule.throttle_window_minutes,
      throttle_max_per_window: rule.throttle_max_per_window,
      recipient_emails: rule.recipient_emails,
      channel_ids: rule.channel_ids,
      priority: rule.priority,
      enabled: rule.enabled
    })
    setShowRuleModal(true)
  }
  
  const handleSaveRule = async () => {
    try {
      const url = '/api/notifications/rules'
      const method = editingRule ? 'PUT' : 'POST'
      const body = editingRule
        ? { id: editingRule.id, ...ruleFormData }
        : ruleFormData
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowRuleModal(false)
        fetchRules()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('Error saving rule')
    }
  }
  
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    
    try {
      const response = await fetch(`/api/notifications/rules?id=${ruleId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchRules()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Error deleting rule')
    }
  }
  
  const handleToggleRule = async (rule: NotificationRule) => {
    try {
      const response = await fetch('/api/notifications/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          enabled: !rule.enabled
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchRules()
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }
  
  const getChannelTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      email: '📧',
      slack: '💬',
      webhook: '🔗',
      telegram: '✈️',
      sms: '📱'
    }
    return icons[type] || '🔔'
  }
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-blue-600 bg-blue-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'throttled': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }
  
  const eventTypeOptions = [
    'mass_attack',
    'ddos_attempt',
    'brute_force',
    'sql_injection',
    'xss_attempt',
    'suspicious_spike',
    'new_bot_detected',
    'rate_limit_exceeded'
  ]
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔔 Notification Settings</h1>
        <p className="text-gray-600 mt-1">Configure alert channels, rules, and review notification history</p>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'channels'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📡 Channels ({channels.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rules'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            ⚙️ Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📋 History ({history.length})
          </button>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Channels Tab */}
              {activeTab === 'channels' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">
                      Configure notification delivery channels (Email, Slack, Webhooks, etc.)
                    </p>
                    <button
                      onClick={handleCreateChannel}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                      + Add Channel
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channels.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-gray-500">
                        No notification channels configured. Add your first channel to get started.
                      </div>
                    ) : (
                      channels.map((channel) => (
                        <div key={channel.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="text-2xl">{getChannelTypeIcon(channel.channel_type)}</div>
                              <div>
                                <div className="font-medium text-gray-900">{channel.channel_name}</div>
                                <div className="text-xs text-gray-500">{channel.channel_type}</div>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={channel.enabled}
                                onChange={() => handleToggleChannel(channel)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                          
                          <div className="text-xs text-gray-600 space-y-1 mb-3">
                            <div>Sent: <span className="font-semibold text-green-600">{channel.total_sent}</span></div>
                            <div>Failed: <span className="font-semibold text-red-600">{channel.total_failed}</span></div>
                            {channel.last_sent_at && (
                              <div className="text-gray-500">
                                Last: {new Date(channel.last_sent_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditChannel(channel)}
                              className="flex-1 text-xs px-3 py-1.5 border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteChannel(channel.id)}
                              className="flex-1 text-xs px-3 py-1.5 border border-red-600 text-red-600 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
              
              {/* Rules Tab */}
              {activeTab === 'rules' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">
                      Define when and how notifications should be sent
                    </p>
                    <button
                      onClick={handleCreateRule}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                      + Add Rule
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {rules.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No notification rules configured. Create a rule to start receiving alerts.
                      </div>
                    ) : (
                      rules.map((rule) => (
                        <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-medium text-gray-900">{rule.rule_name}</div>
                                <span className={`text-xs px-2 py-1 rounded font-medium ${getSeverityColor(rule.min_severity)}`}>
                                  Min: {rule.min_severity}
                                </span>
                                {rule.priority > 0 && (
                                  <span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 font-medium">
                                    Priority: {rule.priority}
                                  </span>
                                )}
                              </div>
                              
                              {rule.description && (
                                <div className="text-sm text-gray-600 mb-2">{rule.description}</div>
                              )}
                              
                              <div className="flex flex-wrap gap-2 text-xs">
                                <div className="text-gray-600">
                                  Events: <span className="font-semibold">{rule.event_types.length}</span>
                                </div>
                                <div className="text-gray-600">
                                  Recipients: <span className="font-semibold">{rule.recipient_emails.length}</span>
                                </div>
                                <div className="text-gray-600">
                                  Triggered: <span className="font-semibold">{rule.triggered_count}</span>
                                </div>
                                {rule.throttle_enabled && (
                                  <div className="text-orange-600">
                                    Throttled: {rule.throttle_max_per_window}/{rule.throttle_window_minutes}min
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rule.enabled}
                                  onChange={() => handleToggleRule(rule)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                              </label>
                              
                              <button
                                onClick={() => handleEditRule(rule)}
                                className="text-indigo-600 hover:text-indigo-900 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
              
              {/* History Tab */}
              {activeTab === 'history' && (
                <>
                  {statistics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-600">Total (24h)</div>
                        <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <div className="text-sm text-green-600">Sent</div>
                        <div className="text-2xl font-bold text-green-900">{statistics.sent}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-red-200">
                        <div className="text-sm text-red-600">Failed</div>
                        <div className="text-2xl font-bold text-red-900">{statistics.failed}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-600">Pending</div>
                        <div className="text-2xl font-bold text-blue-900">{statistics.pending}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-yellow-200">
                        <div className="text-sm text-yellow-600">Throttled</div>
                        <div className="text-2xl font-bold text-yellow-900">{statistics.throttled}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Rule</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Channel</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Event</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Severity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Recipient</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {history.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              No notification history found
                            </td>
                          </tr>
                        ) : (
                          history.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{item.rule_name || '-'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span>{getChannelTypeIcon(item.channel_type)}</span>
                                  <span className="text-sm text-gray-600">{item.channel_name || '-'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.event_type?.replace(/_/g, ' ')}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded font-medium ${getSeverityColor(item.severity)}`}>
                                  {item.severity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.recipient}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(item.status)}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">
                                {new Date(item.created_at).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Channel Modal - Simplified for now */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingChannel ? 'Edit Channel' : 'Create Channel'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name *
                </label>
                <input
                  type="text"
                  value={channelFormData.channel_name}
                  onChange={(e) => setChannelFormData({ ...channelFormData, channel_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Primary Email Alerts"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Type *
                </label>
                <select
                  value={channelFormData.channel_type}
                  onChange={(e) => setChannelFormData({ ...channelFormData, channel_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="email">Email (SMTP)</option>
                  <option value="slack">Slack</option>
                  <option value="webhook">Webhook</option>
                  <option value="telegram">Telegram</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              
              {channelFormData.channel_type === 'email' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMTP Host *
                      </label>
                      <input
                        type="text"
                        value={channelFormData.config.smtp_host}
                        onChange={(e) => setChannelFormData({
                          ...channelFormData,
                          config: { ...channelFormData.config, smtp_host: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMTP Port *
                      </label>
                      <input
                        type="number"
                        value={channelFormData.config.smtp_port}
                        onChange={(e) => setChannelFormData({
                          ...channelFormData,
                          config: { ...channelFormData.config, smtp_port: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP User *
                    </label>
                    <input
                      type="text"
                      value={channelFormData.config.smtp_user}
                      onChange={(e) => setChannelFormData({
                        ...channelFormData,
                        config: { ...channelFormData.config, smtp_user: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Password *
                    </label>
                    <input
                      type="password"
                      value={channelFormData.config.smtp_password}
                      onChange={(e) => setChannelFormData({
                        ...channelFormData,
                        config: { ...channelFormData.config, smtp_password: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Email *
                      </label>
                      <input
                        type="email"
                        value={channelFormData.config.from_email}
                        onChange={(e) => setChannelFormData({
                          ...channelFormData,
                          config: { ...channelFormData.config, from_email: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Name
                      </label>
                      <input
                        type="text"
                        value={channelFormData.config.from_name}
                        onChange={(e) => setChannelFormData({
                          ...channelFormData,
                          config: { ...channelFormData.config, from_name: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Traffic Control Alerts"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowChannelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChannel}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingChannel ? 'Save Changes' : 'Create Channel'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rule Modal - Simplified for now */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRule ? 'Edit Notification Rule' : 'Create Notification Rule'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={ruleFormData.rule_name}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, rule_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Critical Security Alerts"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={ruleFormData.description}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Describe when this rule should trigger"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Types * (comma-separated)
                </label>
                <input
                  type="text"
                  value={ruleFormData.event_types.join(', ')}
                  onChange={(e) => setRuleFormData({
                    ...ruleFormData,
                    event_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="mass_attack, ddos_attempt, sql_injection"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Available: {eventTypeOptions.join(', ')}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Severity
                  </label>
                  <select
                    value={ruleFormData.min_severity}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, min_severity: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={ruleFormData.priority}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Emails * (comma-separated)
                </label>
                <input
                  type="text"
                  value={ruleFormData.recipient_emails.join(', ')}
                  onChange={(e) => setRuleFormData({
                    ...ruleFormData,
                    recipient_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="admin@example.com, security@example.com"
                />
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Throttling (Prevent Spam)</h3>
                
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="throttle_enabled"
                    checked={ruleFormData.throttle_enabled}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, throttle_enabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="throttle_enabled" className="text-sm text-gray-700">
                    Enable notification throttling
                  </label>
                </div>
                
                {ruleFormData.throttle_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Window (minutes)
                      </label>
                      <input
                        type="number"
                        value={ruleFormData.throttle_window_minutes}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, throttle_window_minutes: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max per window
                      </label>
                      <input
                        type="number"
                        value={ruleFormData.throttle_max_per_window}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, throttle_max_per_window: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
