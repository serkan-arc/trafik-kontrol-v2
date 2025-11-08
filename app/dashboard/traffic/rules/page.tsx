'use client';

import { useState, useEffect } from 'react';

interface Rule {
  id: string;
  name: string;
  description?: string;
  priority?: number | string | 'high' | 'medium' | 'low';
  status?: 'active' | 'inactive';
  enabled?: boolean;
  conditions?: any; // Can be array or object from API
  action?: string; // Single action from API
  actions?: Array<{
    type: string;
    value?: string;
  }>;
  matches?: number;
  triggered_count?: number;
  last_triggered?: string;
  created_at?: string;
  created_by?: string;
  redirect_version?: string;
}

export default function AutoRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showTestMode, setShowTestMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const normalizeRule = (rule: any): Rule => {
    // Normalize priority
    let priority = rule.priority;
    if (typeof priority === 'number') {
      if (priority >= 10) priority = 'high';
      else if (priority >= 5) priority = 'medium';
      else priority = 'low';
    }
    
    // Normalize status from enabled field
    const status = rule.enabled === false ? 'inactive' : 'active';
    
    // Normalize conditions to array
    let conditions = [];
    if (Array.isArray(rule.conditions)) {
      conditions = rule.conditions;
    } else if (rule.conditions && typeof rule.conditions === 'object') {
      // Convert object format to array
      conditions = Object.entries(rule.conditions).map(([field, config]: any) => ({
        field,
        operator: config.operator || '>=',
        value: config.value || '',
        logic: 'AND'
      }));
    }
    
    // Normalize actions
    let actions = rule.actions || [];
    if (rule.action && !rule.actions) {
      actions = [{ type: rule.action, value: rule.redirect_version }];
    }
    
    return {
      ...rule,
      priority,
      status,
      conditions,
      actions,
      matches: rule.triggered_count || rule.matches || 0
    };
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/traffic/rules');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const normalizedRules = data.data.map(normalizeRule);
        setRules(normalizedRules);
      } else {
        setRules([]);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: string) => {
    try {
      const res = await fetch(`/api/traffic/rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: currentStatus === 'active' ? 'inactive' : 'active' 
        })
      });
      
      if (res.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Bu kuralı silmek istediğinize emin misiniz?')) return;
    
    try {
      const res = await fetch(`/api/traffic/rules/${ruleId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleTestRule = async (ruleId: string) => {
    setShowTestMode(true);
    setSelectedRule(ruleId);
    
    try {
      const res = await fetch(`/api/traffic/rules/${ruleId}/test`, {
        method: 'POST'
      });
      const data = await res.json();
      setTestResults(data);
    } catch (error) {
      console.error('Error testing rule:', error);
    }
  };

  const getPriorityColor = (priority: any) => {
    const p = String(priority).toLowerCase();
    switch(p) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getOperatorLabel = (operator: string) => {
    const labels: { [key: string]: string } = {
      'equals': '=',
      'not_equals': '≠',
      'greater_than': '>',
      'less_than': '<',
      'contains': 'içerir',
      'not_contains': 'içermez',
      'starts_with': 'ile başlar',
      'ends_with': 'ile biter'
    };
    return labels[operator] || operator;
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (rule.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || rule.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || rule.status === filterStatus;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 text-gray-900">
              <span className="text-2xl">⚙️</span>
              Otomatik Kural Yönetimi
            </h1>
            <p className="text-gray-600 mt-3 text-lg">
              Akıllı trafik kuralları ile otomatik eylem ve filtreleme
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{rules.filter(r => r.status === 'active').length}</p>
              <p className="text-sm text-gray-600">Aktif Kural</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all flex items-center gap-2"
            >
              <span className="text-xl">➕</span>
              Yeni Kural Oluştur
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <p className="text-gray-600 text-sm">Toplam Kural</p>
            <p className="text-2xl font-bold text-gray-900">{rules.length}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <p className="text-gray-600 text-sm">Bugün Tetiklenen</p>
            <p className="text-2xl font-bold text-gray-900">{rules.reduce((sum, r) => sum + (r.matches || 0), 0)}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <p className="text-gray-600 text-sm">Yüksek Öncelikli</p>
            <p className="text-2xl font-bold text-gray-900">{rules.filter(r => r.priority === 'high').length}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <p className="text-gray-600 text-sm">Test Modu</p>
            <p className="text-2xl font-bold text-gray-900">{showTestMode ? 'Açık' : 'Kapalı'}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400 text-xl">🔎</span>
              <input
                type="text"
                placeholder="Kural adı veya açıklama ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">🎯 Tüm Öncelikler</option>
            <option value="high">🔴 Yüksek</option>
            <option value="medium">🟡 Orta</option>
            <option value="low">🟢 Düşük</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">📊 Tüm Durumlar</option>
            <option value="active">✅ Aktif</option>
            <option value="inactive">⏸️ Pasif</option>
          </select>
        </div>

        {/* Test Mode Toggle */}
        <div className="mt-4 flex items-center justify-between p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <p className="font-semibold text-purple-900">Test Modu</p>
              <p className="text-sm text-purple-600">Kuralları gerçek trafik üzerinde test et</p>
            </div>
          </div>
          <button
            onClick={() => setShowTestMode(!showTestMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showTestMode ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showTestMode ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Kurallar yükleniyor...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{rule.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(rule.priority || 'medium')}`}>
                        {String(rule.priority || 'medium').toUpperCase()}
                      </span>
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
                        rule.status === 'active' ? 'bg-green-600' : 'bg-gray-300'
                      }`} onClick={() => handleToggleRule(rule.id, rule.status || 'inactive')}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          rule.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">{rule.description}</p>

                    {/* Conditions Display */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Koşullar:</h4>
                      <div className="space-y-2">
                        {(rule.conditions || []).map((condition: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            {idx > 0 && (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                condition.logic === 'AND' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {condition.logic}
                              </span>
                            )}
                            <code className="bg-white px-2 py-1 rounded border border-gray-200">
                              {condition.field} {getOperatorLabel(condition.operator)} {condition.value}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions Display */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">⚡ Eylemler:</h4>
                      <div className="flex flex-wrap gap-2">
                        {(rule.actions || []).map((action: any, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                            {action.type === 'whitelist' && '✅ Whitelist\'e Ekle'}
                            {action.type === 'blacklist' && '🚫 Blacklist\'e Ekle'}
                            {action.type === 'graylist' && '🟡 Graylist\'e Ekle'}
                            {action.type === 'alert' && '🔔 Uyarı Gönder'}
                            {action.type === 'block' && '🛑 Engelle'}
                            {action.type === 'redirect' && `↪️ Yönlendir: ${action.value}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stats Panel */}
                  <div className="ml-6 text-center">
                    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg p-4 mb-4">
                      <p className="text-3xl font-bold text-purple-700">{rule.matches || 0}</p>
                      <p className="text-xs text-purple-600">Eşleşme</p>
                    </div>
                    <div className="text-xs text-gray-500 mb-4">
                      <p>Son tetiklenme:</p>
                      <p className="font-semibold">{rule.last_triggered ? new Date(rule.last_triggered).toLocaleString('tr-TR') : 'Henüz tetiklenmedi'}</p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {showTestMode && (
                        <button
                          onClick={() => handleTestRule(rule.id)}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                        >
                          🧪 Test Et
                        </button>
                      )}
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        ✏️ Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Results Panel */}
              {showTestMode && selectedRule === rule.id && testResults && (
                <div className="border-t bg-purple-50 p-6">
                  <h4 className="font-semibold text-purple-900 mb-3">🧪 Test Sonuçları:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">Eşleşen IP</p>
                      <p className="text-xl font-bold text-purple-700">{testResults.matchedIPs || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">Uygulanan Eylem</p>
                      <p className="text-xl font-bold text-green-700">{testResults.actionsApplied || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">Performans</p>
                      <p className="text-xl font-bold text-blue-700">{testResults.executionTime || '0'}ms</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Rule Modal - Temporarily disabled until modal component is created */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md">
            <h3 className="text-xl font-bold mb-4">Yeni Kural Oluştur</h3>
            <p className="text-gray-600 mb-4">Kural oluşturma modalı yakında eklenecek.</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}