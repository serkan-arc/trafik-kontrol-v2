'use client';

import { useState, useEffect } from 'react';

interface BotData {
  ip_address: string;
  user_agent: string;
  bot_type: 'crawler' | 'scraper' | 'good_bot' | 'bad_bot' | 'unknown';
  bot_name: string;
  confidence_score: number;
  first_seen: string;
  last_seen: string;
  total_requests: number;
  crawled_pages: string[];
  blocked_attempts: number;
  status: 'allowed' | 'blocked' | 'monitoring';
  verified: boolean;
  behavior_score: number;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
}

export default function BotDetectionPage() {
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total_bots: 0,
    good_bots: 0,
    bad_bots: 0,
    blocked_today: 0,
    crawl_rate: 0,
    threat_bots: 0
  });
  const [realTimeActivity, setRealTimeActivity] = useState<any[]>([]);
  const [knownBots, setKnownBots] = useState<any[]>([]);

  useEffect(() => {
    fetchBotData();
    fetchStats();
    const interval = setInterval(fetchRealTimeActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBotData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/traffic/bots');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBots(data.data);
      } else {
        setBots([]);
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/traffic/bots/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRealTimeActivity = async () => {
    try {
      const res = await fetch('/api/traffic/bots/real-time');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRealTimeActivity(data.data);
      } else {
        setRealTimeActivity([]);
      }
    } catch (error) {
      console.error('Error fetching real-time activity:', error);
    }
  };

  const handleBotAction = async (ip: string, action: string) => {
    try {
      const res = await fetch(`/api/traffic/bots/${ip}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (res.ok) {
        fetchBotData();
        fetchStats();
      }
    } catch (error) {
      console.error('Error performing bot action:', error);
    }
  };

  const handleVerifyBot = async (ip: string) => {
    try {
      const res = await fetch(`/api/traffic/bots/${ip}/verify`, {
        method: 'POST'
      });
      
      if (res.ok) {
        fetchBotData();
      }
    } catch (error) {
      console.error('Error verifying bot:', error);
    }
  };

  const getBotTypeIcon = (type: string) => {
    switch(type) {
      case 'crawler': return '🕷️';
      case 'scraper': return '🔍';
      case 'good_bot': return '🤖';
      case 'bad_bot': return '👾';
      default: return '❓';
    }
  };

  const getThreatColor = (level: string) => {
    switch(level) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.ip_address.includes(searchQuery) ||
                         bot.bot_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bot.user_agent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || bot.bot_type === filterType;
    const matchesStatus = filterStatus === 'all' || bot.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 text-gray-900">
              <span className="text-2xl">🤖</span>
              Bot Tespit & Yönetim Merkezi
            </h1>
            <p className="text-gray-600 mt-3 text-lg">
              Gelişmiş bot analizi, davranış tespiti ve otomatik koruma
            </p>
          </div>
          <div className="text-right">
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 mb-3">
              <p className="text-3xl font-bold text-cyan-600">{stats.total_bots}</p>
              <p className="text-sm text-gray-600">Tespit Edilen Bot</p>
            </div>
            <button className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-all">
              🛡️ Koruma Ayarları
            </button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mt-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">✅</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.good_bots}</p>
            <p className="text-xs text-gray-600">İyi Bot</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">⛔</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.bad_bots}</p>
            <p className="text-xs text-gray-600">Kötü Bot</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">🚫</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.blocked_today}</p>
            <p className="text-xs text-gray-600">Bugün Engellenen</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">📊</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.crawl_rate}/dk</p>
            <p className="text-xs text-gray-600">Crawl Hızı</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">⚠️</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.threat_bots}</p>
            <p className="text-xs text-gray-600">Tehdit</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-lg">✔️</span>
            <p className="text-2xl font-bold mt-1 text-gray-900">{bots.filter(b => b.verified).length}</p>
            <p className="text-xs text-gray-600">Doğrulanmış</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 Genel Bakış
          </button>
          <button
            onClick={() => setActiveTab('detected')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'detected'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🔍 Tespit Edilenler
          </button>
          <button
            onClick={() => setActiveTab('realtime')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'realtime'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ⚡ Canlı Aktivite
          </button>
          <button
            onClick={() => setActiveTab('known')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'known'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📚 Bilinen Botlar
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'patterns'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🎯 Davranış Analizi
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bot Type Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Bot Tipi Dağılımı</h3>
            <div className="space-y-4">
              {['crawler', 'scraper', 'good_bot', 'bad_bot', 'unknown'].map(type => {
                const count = bots.filter(b => b.bot_type === type).length;
                const percentage = (count / bots.length) * 100 || 0;
                
                return (
                  <div key={type} className="flex items-center gap-4">
                    <span className="text-lg w-8">{getBotTypeIcon(type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-cyan-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Threat Level Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Tehdit Seviyeleri</h3>
            <div className="grid grid-cols-2 gap-4">
              {['critical', 'high', 'medium', 'low'].map(level => {
                const count = bots.filter(b => b.threat_level === level).length;
                return (
                  <div key={level} className={`rounded-lg p-4 border-2 ${getThreatColor(level)}`}>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm capitalize">{level}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'detected' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="IP, bot adı veya user agent ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">Tüm Tipler</option>
                <option value="crawler">🕷️ Crawler</option>
                <option value="scraper">🔍 Scraper</option>
                <option value="good_bot">🤖 İyi Bot</option>
                <option value="bad_bot">👾 Kötü Bot</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="allowed">✅ İzinli</option>
                <option value="blocked">🚫 Engellenmiş</option>
                <option value="monitoring">👁️ İzleniyor</option>
              </select>
            </div>
          </div>

          {/* Bot Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-2 flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600"></div>
              </div>
            ) : (
              filteredBots.map(bot => (
                <div key={bot.ip_address} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getBotTypeIcon(bot.bot_type)}</span>
                        <div>
                          <p className="font-bold text-lg">{bot.bot_name || 'Unknown Bot'}</p>
                          <p className="text-sm text-gray-600 font-mono">{bot.ip_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bot.verified && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ✓ Doğrulandı
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getThreatColor(bot.threat_level)}`}>
                          {bot.threat_level.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* User Agent */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">User Agent:</p>
                      <p className="text-sm font-mono text-gray-700 break-all">{bot.user_agent}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{bot.total_requests}</p>
                        <p className="text-xs text-gray-500">İstek</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-cyan-600">{bot.confidence_score}%</p>
                        <p className="text-xs text-gray-500">Güven</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{bot.blocked_attempts}</p>
                        <p className="text-xs text-gray-500">Engelleme</p>
                      </div>
                    </div>

                    {/* Crawled Pages */}
                    {bot.crawled_pages.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">Son Taranan Sayfalar:</p>
                        <div className="flex flex-wrap gap-1">
                          {bot.crawled_pages.slice(0, 5).map((page, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {page}
                            </span>
                          ))}
                          {bot.crawled_pages.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              +{bot.crawled_pages.length - 5} daha
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {bot.status !== 'blocked' && (
                        <button
                          onClick={() => handleBotAction(bot.ip_address, 'block')}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          🚫 Engelle
                        </button>
                      )}
                      {bot.status === 'blocked' && (
                        <button
                          onClick={() => handleBotAction(bot.ip_address, 'allow')}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          ✅ İzin Ver
                        </button>
                      )}
                      {!bot.verified && (
                        <button
                          onClick={() => handleVerifyBot(bot.ip_address)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          🔍 Doğrula
                        </button>
                      )}
                      <button
                        onClick={() => handleBotAction(bot.ip_address, 'monitor')}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                      >
                        👁️ İzle
                      </button>
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-between">
                    <span>İlk: {new Date(bot.first_seen).toLocaleDateString('tr-TR')}</span>
                    <span>Son: {new Date(bot.last_seen).toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'realtime' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            Canlı Bot Aktivitesi
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {realTimeActivity.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getBotTypeIcon(activity.bot_type)}</span>
                  <div>
                    <p className="font-mono text-sm">{activity.ip}</p>
                    <p className="text-xs text-gray-500">{activity.bot_name}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.page}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    activity.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {activity.blocked ? 'Engellendi' : 'İzin Verildi'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}