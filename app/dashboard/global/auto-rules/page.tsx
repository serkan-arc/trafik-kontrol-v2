'use client'

import { useState, useEffect } from 'react'

interface Rule {
  id: string
  rule_name: string
  rule_type: string
  conditions: any
  action: string
  action_config: any
  priority: number
  enabled: boolean
  apply_to: string
  domain_list: string[]
  triggered_count: number
  last_triggered_at: string | null
  blocked_requests: number
  challenged_requests: number
  description: string
  created_by: string
  created_at: string
  updated_at: string
}

interface Statistics {
  total_rules: number
  enabled_rules: number
  rate_limit_rules: number
  path_blocking_rules: number
  geo_blocking_rules: number
  total_triggers: number
  total_blocks: number
}

interface Trigger {
  id: string
  rule_name: string
  ip: string
  domain: string
  path: string
  action: string
  blocked: boolean
  triggered_at: string
}

export default function AutoRulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'rules' | 'triggers'>('rules')
  
  // Filters
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('')
  const [enabledFilter, setEnabledFilter] = useState<string>('')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'rate_limit',
    conditions: '{}',
    action: 'block',
    action_config: '{}',
    priority: 0,
    enabled: true,
    apply_to: 'all',
    domain_list: '',
    description: ''
  })

  useEffect(() => {
    fetchRules()
    fetchTriggers()
  }, [ruleTypeFilter, enabledFilter])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (ruleTypeFilter) params.append('rule_type', ruleTypeFilter)
      if (enabledFilter) params.append('enabled', enabledFilter)

      const response = await fetch(`/api/global/auto-rules?${params}`)
      const data = await response.json()

      if (data.success) {
        setRules(data.data.rules)
        setStatistics(data.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTriggers = async () => {
    try {
      const response = await fetch('/api/global/auto-rules/triggers?limit=50')
      const data = await response.json()

      if (data.success) {
        setTriggers(data.data.triggers)
      }
    } catch (error) {
      console.error('Error fetching triggers:', error)
    }
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setFormData({
      rule_name: '',
      rule_type: 'rate_limit',
      conditions: '{}',
      action: 'block',
      action_config: '{}',
      priority: 0,
      enabled: true,
      apply_to: 'all',
      domain_list: '',
      description: ''
    })
    setShowModal(true)
  }

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule)
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      conditions: JSON.stringify(rule.conditions, null, 2),
      action: rule.action,
      action_config: JSON.stringify(rule.action_config, null, 2),
      priority: rule.priority,
      enabled: rule.enabled,
      apply_to: rule.apply_to,
      domain_list: rule.domain_list?.join(', ') || '',
      description: rule.description || ''
    })
    setShowModal(true)
  }

  const handleSaveRule = async () => {
    try {
      // Parse JSON fields
      let conditions, action_config
      try {
        conditions = JSON.parse(formData.conditions)
        action_config = JSON.parse(formData.action_config)
      } catch (e) {
        alert('Invalid JSON in conditions or action_config')
        return
      }

      const payload = {
        ...formData,
        conditions,
        action_config,
        domain_list: formData.domain_list.split(',').map(d => d.trim()).filter(d => d)
      }

      const url = editingRule 
        ? '/api/global/auto-rules'
        : '/api/global/auto-rules'
      
      const method = editingRule ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule ? { id: editingRule.id, ...payload } : payload)
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        setShowModal(false)
        fetchRules()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('Failed to save rule')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/global/auto-rules?id=${ruleId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        fetchRules()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Failed to delete rule')
    }
  }

  const handleToggleRule = async (rule: Rule) => {
    try {
      const response = await fetch('/api/global/auto-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled })
      })

      const data = await response.json()

      if (data.success) {
        fetchRules()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  const getRuleTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      rate_limit: 'bg-blue-100 text-blue-700',
      path_blocking: 'bg-red-100 text-red-700',
      geo_blocking: 'bg-yellow-100 text-yellow-700',
      user_agent: 'bg-purple-100 text-purple-700',
      behavior_pattern: 'bg-green-100 text-green-700',
      time_based: 'bg-orange-100 text-orange-700',
      ip_range: 'bg-gray-100 text-gray-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      allow: 'bg-green-100 text-green-700',
      block: 'bg-red-100 text-red-700',
      drop: 'bg-gray-100 text-gray-700',
      challenge: 'bg-yellow-100 text-yellow-700',
      rate_limit: 'bg-blue-100 text-blue-700',
      log_only: 'bg-gray-50 text-gray-600'
    }
    return colors[action] || 'bg-gray-100 text-gray-700'
  }

  if (loading && rules.length === 0) {
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
              ⚙️ Global Auto Rules
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Automated security rules applied across all domains
            </p>
          </div>
          <button
            onClick={handleCreateRule}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            <span>Create Rule</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Total Rules</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.total_rules}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Enabled</p>
            <p className="text-2xl font-bold text-green-600">{statistics.enabled_rules}</p>
          </div>

          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Rate Limit</p>
            <p className="text-2xl font-bold text-blue-600">{statistics.rate_limit_rules}</p>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Path Blocking</p>
            <p className="text-2xl font-bold text-red-600">{statistics.path_blocking_rules}</p>
          </div>

          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Total Triggers</p>
            <p className="text-2xl font-bold text-yellow-600">{statistics.total_triggers || 0}</p>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Total Blocks</p>
            <p className="text-2xl font-bold text-red-600">{statistics.total_blocks || 0}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'rules'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rules ({rules.length})
            </button>
            <button
              onClick={() => setActiveTab('triggers')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'triggers'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recent Triggers ({triggers.length})
            </button>
          </div>
        </div>

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type</label>
                <select
                  value={ruleTypeFilter}
                  onChange={(e) => setRuleTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="rate_limit">Rate Limit</option>
                  <option value="path_blocking">Path Blocking</option>
                  <option value="geo_blocking">Geo Blocking</option>
                  <option value="user_agent">User Agent</option>
                  <option value="behavior_pattern">Behavior Pattern</option>
                  <option value="time_based">Time Based</option>
                  <option value="ip_range">IP Range</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={enabledFilter}
                  onChange={(e) => setEnabledFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Status</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setRuleTypeFilter('')
                    setEnabledFilter('')
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Rules List */}
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{rule.rule_name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getRuleTypeColor(rule.rule_type)}`}>
                          {rule.rule_type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getActionColor(rule.action)}`}>
                          {rule.action}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Priority: {rule.priority}
                        </span>
                      </div>
                      
                      {rule.description && (
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Apply to: <span className="font-medium">{rule.apply_to}</span></span>
                        <span>Triggered: <span className="font-medium">{rule.triggered_count}</span></span>
                        <span>Blocked: <span className="font-medium text-red-600">{rule.blocked_requests}</span></span>
                        <span>Challenged: <span className="font-medium text-yellow-600">{rule.challenged_requests}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>

                      <button
                        onClick={() => handleEditRule(rule)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {rules.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">No rules found</p>
                  <p className="text-sm">Create your first auto rule to get started</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Triggers Tab */}
        {activeTab === 'triggers' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rule</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Path</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {triggers.map((trigger) => (
                    <tr key={trigger.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{trigger.rule_name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{trigger.ip}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{trigger.domain}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{trigger.path || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${getActionColor(trigger.action)}`}>
                          {trigger.action}
                        </span>
                        {trigger.blocked && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            Blocked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(trigger.triggered_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {triggers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>No triggers recorded yet</p>
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
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                <input
                  type="text"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Block wp-admin access"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type</label>
                  <select
                    value={formData.rule_type}
                    onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="rate_limit">Rate Limit</option>
                    <option value="path_blocking">Path Blocking</option>
                    <option value="geo_blocking">Geo Blocking</option>
                    <option value="user_agent">User Agent</option>
                    <option value="behavior_pattern">Behavior Pattern</option>
                    <option value="time_based">Time Based</option>
                    <option value="ip_range">IP Range</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="allow">Allow</option>
                    <option value="block">Block</option>
                    <option value="drop">Drop</option>
                    <option value="challenge">Challenge</option>
                    <option value="rate_limit">Rate Limit</option>
                    <option value="log_only">Log Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conditions (JSON)
                </label>
                <textarea
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  rows={4}
                  placeholder='{"paths": ["/wp-admin", "/.env"]}'
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Config (JSON)
                </label>
                <textarea
                  value={formData.action_config}
                  onChange={(e) => setFormData({ ...formData, action_config: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  rows={3}
                  placeholder='{"response_code": 403}'
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apply To</label>
                  <select
                    value={formData.apply_to}
                    onChange={(e) => setFormData({ ...formData, apply_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Domains</option>
                    <option value="specific">Specific Domains</option>
                    <option value="exclude">Exclude Domains</option>
                  </select>
                </div>
              </div>

              {formData.apply_to !== 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain List (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.domain_list}
                    onChange={(e) => setFormData({ ...formData, domain_list: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="example.com, test.com"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Brief description of this rule"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                  Enable this rule immediately
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
                onClick={handleSaveRule}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
