'use client';

import { useState, useEffect } from 'react';

interface SpamEntry {
  id: string;
  ip_address: string;
  form_id: string;
  form_name: string;
  submission_time: string;
  spam_score: number;
  spam_type: 'duplicate' | 'rapid' | 'pattern' | 'blacklisted' | 'suspicious';
  form_data: Record<string, any>;
  detection_reasons: string[];
  status: 'spam' | 'legitimate' | 'reviewing';
  blocked: boolean;
  country: string;
  user_agent: string;
  referrer: string;
  submission_count: number;
  time_between_submissions: number;
}

export default function SpamControlPage() {
  const [spamEntries, setSpamEntries] = useState<SpamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [stats, setStats] = useState({
    total_spam: 0,
    blocked_today: 0,
    legitimate_marked: 0,
    review_queue: 0,
    spam_rate: 0,
    top_spam_ip: '',
    most_targeted_form: ''
  });
  const [patterns, setPatterns] = useState<any[]>([]);
  const [showPatternModal, setShowPatternModal] = useState(false);

  useEffect(() => {
    fetchSpamData();
    fetchStats();
    fetchPatterns();
  }, [dateRange]);

  const fetchSpamData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: dateRange });
      const res = await fetch(`/api/traffic/form-spam?${params}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSpamEntries(data.data);
      } else {
        setSpamEntries([]);
      }
    } catch (error) {
      console.error('Error fetching spam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/traffic/form-spam/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPatterns = async () => {
    try {
      const res = await fetch('/api/traffic/form-spam/patterns');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPatterns(data.data);
      } else {
        setPatterns([]);
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
    }
  };

  const handleMarkLegitimate = async (id: string) => {
    try {
      const res = await fetch(`/api/traffic/form-spam/${id}/legitimate`, {
        method: 'POST'
      });
      
      if (res.ok) {
        fetchSpamData();
        fetchStats();
      }
    } catch (error) {
      console.error('Error marking as legitimate:', error);
    }
  };

  const handleBlockIP = async (ip: string) => {
    try {
      const res = await fetch(`/api/traffic/form-spam/${ip}/block`, {
        method: 'POST'
      });
      
      if (res.ok) {
        fetchSpamData();
        fetchStats();
      }
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  };

  const getSpamTypeIcon = (type: string) => {
    switch(type) {
      case 'duplicate': return '🔁';
      case 'rapid': return '⚡';
      case 'pattern': return '🎯';
      case 'blacklisted': return '🚫';
      case 'suspicious': return '🤔';
      default: return '❓';
    }
  };

  const getSpamScoreColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 60) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const filteredEntries = spamEntries.filter(entry => {
    const matchesSearch = entry.ip_address.includes(searchQuery) ||
                         entry.form_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || entry.spam_type === filterType;
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 text-gray-900">
              <span className="text-2xl">🚫</span>
              Spam Kontrol Merkezi
            </h1>
            <p className="text-gray-600 mt-3 text-lg">
              Form spam tespiti, pattern analizi ve otomatik engelleme sistemi
            </p>
          </div>
          <div className="text-right">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-600">{stats.total_spam}</p>
                <p className="text-xs text-gray-600">Toplam Spam</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-orange-600">{stats.spam_rate}%</p>
                <p className="text-xs text-gray-600">Spam Oranı</p>
              </div>
            </div>
            <button
              onClick={() => setShowPatternModal(true)}
              className="mt-3 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all w-full"
            >
              🎯 Pattern Yönetimi
            </button>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="grid grid-cols-6 gap-4 mt-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">🚫</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.blocked_today}</p>
            <p className="text-xs text-gray-600">Bugün Engellenen</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">✅</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.legitimate_marked}</p>
            <p className="text-xs text-gray-600">Meşru İşaretlenen</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">👁️</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.review_queue}</p>
            <p className="text-xs text-gray-600">İnceleme Bekleyen</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">🔁</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{spamEntries.filter(e => e.spam_type === 'duplicate').length}</p>
            <p className="text-xs text-gray-600">Duplicate</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">⚡</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{spamEntries.filter(e => e.spam_type === 'rapid').length}</p>
            <p className="text-xs text-gray-600">Hızlı Gönderim</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">🎯</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{patterns.length}</p>
            <p className="text-xs text-gray-600">Aktif Pattern</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('entries')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'entries'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📝 Spam Girişleri
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'patterns'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🎯 Pattern Analizi
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'forms'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📋 Form İstatistikleri
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Spam Type Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Spam Tipi Dağılımı</h3>
            <div className="space-y-3">
              {['duplicate', 'rapid', 'pattern', 'blacklisted', 'suspicious'].map(type => {
                const count = spamEntries.filter(e => e.spam_type === type).length;
                const percentage = (count / spamEntries.length) * 100 || 0;
                
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-2xl w-8">{getSpamTypeIcon(type)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{type}</span>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Spam Sources */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">En Çok Spam Yapan IP'ler</h3>
            <div className="space-y-3">
              {Object.entries(
                spamEntries.reduce((acc: any, entry) => {
                  acc[entry.ip_address] = (acc[entry.ip_address] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([ip, count]) => (
                  <div key={ip} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-mono text-sm font-semibold">{ip}</p>
                      <p className="text-xs text-gray-500">
                        {spamEntries.find(e => e.ip_address === ip)?.country || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{count as number}</p>
                      <p className="text-xs text-gray-500">spam</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Son Aktiviteler</h3>
            <div className="space-y-2">
              {spamEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getSpamTypeIcon(entry.spam_type)}</span>
                    <div>
                      <p className="text-sm font-medium">{entry.form_name}</p>
                      <p className="text-xs text-gray-500">{entry.ip_address}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(entry.submission_time).toLocaleTimeString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'entries' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="IP veya form adı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">Tüm Tipler</option>
                <option value="duplicate">🔁 Duplicate</option>
                <option value="rapid">⚡ Hızlı</option>
                <option value="pattern">🎯 Pattern</option>
                <option value="blacklisted">🚫 Blacklist</option>
                <option value="suspicious">🤔 Şüpheli</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="spam">Spam</option>
                <option value="legitimate">Meşru</option>
                <option value="reviewing">İncelemede</option>
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="today">Bugün</option>
                <option value="week">Bu Hafta</option>
                <option value="month">Bu Ay</option>
                <option value="all">Tümü</option>
              </select>
            </div>
          </div>

          {/* Spam Entries Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tip</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">IP / Ülke</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Form</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Spam Skoru</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tespit Nedeni</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Zaman</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-2xl">{getSpamTypeIcon(entry.spam_type)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-mono text-sm font-semibold">{entry.ip_address}</p>
                          <p className="text-xs text-gray-500">{entry.country}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{entry.form_name}</p>
                          <p className="text-xs text-gray-500">#{entry.form_id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getSpamScoreColor(entry.spam_score)}`}>
                            {entry.spam_score}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {entry.detection_reasons.slice(0, 2).map((reason, idx) => (
                              <span key={idx} className="block text-xs text-gray-600">• {reason}</span>
                            ))}
                            {entry.detection_reasons.length > 2 && (
                              <span className="text-xs text-gray-400">+{entry.detection_reasons.length - 2} daha</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(entry.submission_time).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMarkLegitimate(entry.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              ✓ Meşru
                            </button>
                            <button
                              onClick={() => handleBlockIP(entry.ip_address)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              🚫 Engelle
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'patterns' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Patterns */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Aktif Pattern'ler</h3>
            <div className="space-y-3">
              {patterns.map((pattern, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{pattern.name}</h4>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                      {pattern.matches} eşleşme
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">{pattern.pattern}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Pattern Statistics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Pattern İstatistikleri</h3>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">En Etkili Pattern</p>
                    <p className="text-lg font-bold text-red-900">{patterns[0]?.name || '-'}</p>
                  </div>
                  <div className="text-3xl">🎯</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{patterns.reduce((sum, p) => sum + p.matches, 0)}</p>
                  <p className="text-xs text-gray-500">Toplam Eşleşme</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{patterns.filter(p => p.active).length}</p>
                  <p className="text-xs text-gray-500">Aktif Pattern</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}