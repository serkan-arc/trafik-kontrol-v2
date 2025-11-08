'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  overview: {
    total_ips: number;
    total_visits: number;
    clean_ips: number;
    blacklisted_ips: number;
    avg_risk_score: number;
    conversion_rate: number;
    bot_percentage: number;
    spam_percentage: number;
  };
  risk_levels: {
    low_risk: number;
    medium_risk: number;
    high_risk: number;
    critical_risk: number;
  };
  device_stats: {
    desktop: number;
    mobile: number;
    tablet: number;
    bot: number;
  };
  geographic_stats: Array<{
    country: string;
    ip_count: number;
    total_visits: number;
    risk_score: number;
  }>;
  time_series: Array<{
    date: string;
    visits: number;
    unique_ips: number;
    blocked: number;
    clean: number;
  }>;
  top_threats: Array<{
    ip: string;
    country: string;
    risk_score: number;
    spam_count: number;
    bot_detected: boolean;
    last_seen: string;
  }>;
  conversion_funnel: Array<{
    stage: string;
    users: number;
    percentage: number;
  }>;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState(7);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/traffic/analytics/dashboard?days=${timeRange}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'json') => {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/traffic/analytics/export?format=${format}&days=${timeRange}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traffic-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header with Advanced Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Ultra Traffic Analytics</h1>
            <p className="text-gray-600 mt-2">Gelişmiş trafik analizi, tehdit tespiti ve performans metrikleri</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>Son 24 saat</option>
              <option value={7}>Son 7 gün</option>
              <option value={30}>Son 30 gün</option>
              <option value={90}>Son 90 gün</option>
            </select>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={exportLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                📥 CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exportLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                📄 PDF
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exportLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                📊 JSON
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏠 Genel Bakış
          </button>
          <button
            onClick={() => setActiveTab('threats')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'threats'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🚨 Tehdit Analizi
          </button>
          <button
            onClick={() => setActiveTab('geographic')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'geographic'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🌍 Coğrafi Analiz
          </button>
          <button
            onClick={() => setActiveTab('conversion')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'conversion'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💰 Dönüşüm Analizi
          </button>
          <button
            onClick={() => setActiveTab('realtime')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'realtime'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚡ Gerçek Zamanlı
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-xl text-gray-600">Analytics yükleniyor...</div>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              {/* Enhanced Overview Stats with Trend Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-blue-600">Toplam IP</div>
                    <span className="text-2xl">🌐</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {analytics?.overview?.total_ips || 0}
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-green-600 font-medium">↑ 12.5%</span>
                    <span className="text-xs text-gray-500 ml-2">Son 7 gün</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-green-600">Toplam Ziyaret</div>
                    <span className="text-2xl">📈</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {analytics?.overview?.total_visits || 0}
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-green-600 font-medium">↑ 23.8%</span>
                    <span className="text-xs text-gray-500 ml-2">Son 7 gün</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-yellow-600">Bot Oranı</div>
                    <span className="text-2xl">🤖</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {analytics?.overview?.bot_percentage || 0}%
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-red-600 font-medium">↑ 5.2%</span>
                    <span className="text-xs text-gray-500 ml-2">Kritik</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-red-600">Engellenen</div>
                    <span className="text-2xl">🚫</span>
                  </div>
                  <div className="text-2xl font-bold text-red-900">
                    {analytics?.overview?.blacklisted_ips || 0}
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-red-600 font-medium">↑ 18.3%</span>
                    <span className="text-xs text-gray-500 ml-2">Tehdit artışı</span>
                  </div>
                </div>
              </div>

              {/* Advanced Risk Distribution Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">⚠️</span> Risk Seviyesi Dağılımı
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Düşük Risk', value: analytics?.risk_levels?.low_risk || 0 },
                          { name: 'Orta Risk', value: analytics?.risk_levels?.medium_risk || 0 },
                          { name: 'Yüksek Risk', value: analytics?.risk_levels?.high_risk || 0 },
                          { name: 'Kritik Risk', value: analytics?.risk_levels?.critical_risk || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2, 3].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-sm text-gray-600">Düşük: {analytics?.risk_levels?.low_risk || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-sm text-gray-600">Orta: {analytics?.risk_levels?.medium_risk || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-sm text-gray-600">Yüksek: {analytics?.risk_levels?.high_risk || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-500 rounded"></div>
                      <span className="text-sm text-gray-600">Kritik: {analytics?.risk_levels?.critical_risk || 0}</span>
                    </div>
                  </div>
                </div>
                
                {/* Time Series Traffic Chart */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📊</span> Trafik Akışı
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analytics?.time_series || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="visits" stackId="1" stroke="#3b82f6" fill="#93bbfc" name="Ziyaretler" />
                      <Area type="monotone" dataKey="blocked" stackId="1" stroke="#ef4444" fill="#fca5a5" name="Engellenen" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Enhanced Device & Browser Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📱</span> Cihaz & Tarayıcı Dağılımı
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">💻</span>
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Desktop</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics?.device_stats?.desktop || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((analytics?.device_stats?.desktop || 0) / (analytics?.overview?.total_visits || 1) * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">📱</span>
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Mobile</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics?.device_stats?.mobile || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((analytics?.device_stats?.mobile || 0) / (analytics?.overview?.total_visits || 1) * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">📟</span>
                      <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Tablet</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics?.device_stats?.tablet || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((analytics?.device_stats?.tablet || 0) / (analytics?.overview?.total_visits || 1) * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">🤖</span>
                      <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">Bot</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics?.device_stats?.bot || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {analytics?.overview?.bot_percentage || 0}%
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Threat Analysis Tab */}
          {activeTab === 'threats' && (
            <div className="space-y-6">
              {/* Threat Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium opacity-90">Kritik Tehditler</div>
                      <div className="text-3xl font-bold mt-2">{analytics?.risk_levels?.critical_risk || 0}</div>
                      <div className="text-xs mt-2 opacity-75">Son 24 saatte tespit edildi</div>
                    </div>
                    <span className="text-5xl opacity-50">🚨</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium opacity-90">Spam Girişimi</div>
                      <div className="text-3xl font-bold mt-2">{analytics?.overview?.spam_percentage || 0}%</div>
                      <div className="text-xs mt-2 opacity-75">Toplam trafiğin yüzdesi</div>
                    </div>
                    <span className="text-5xl opacity-50">📧</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium opacity-90">Bot Trafiği</div>
                      <div className="text-3xl font-bold mt-2">{analytics?.overview?.bot_percentage || 0}%</div>
                      <div className="text-xs mt-2 opacity-75">Otomatik sistemler</div>
                    </div>
                    <span className="text-5xl opacity-50">🤖</span>
                  </div>
                </div>
              </div>
              
              {/* Top Threats Table */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">⚠️</span> En Riskli IP'ler
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">IP Adresi</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Ülke</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Risk Skoru</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Spam</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Bot</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Son Görülme</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics?.top_threats?.slice(0, 10).map((threat: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm">{threat.ip}</td>
                          <td className="py-3 px-4">{threat.country}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              threat.risk_score >= 70 ? 'bg-red-100 text-red-700' :
                              threat.risk_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {threat.risk_score}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {threat.spam_count > 0 ? (
                              <span className="text-red-600 font-semibold">{threat.spam_count}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {threat.bot_detected ? (
                              <span className="text-2xl">🤖</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(threat.last_seen).toLocaleString('tr-TR')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button className="text-red-600 hover:text-red-800 font-medium text-sm">
                              Engelle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Geographic Analysis Tab */}
          {activeTab === 'geographic' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🌍</span> Coğrafi Dağılım
                </h3>
                {analytics?.geographic_stats && analytics.geographic_stats.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={analytics.geographic_stats.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="country" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="total_visits" fill="#3b82f6" name="Ziyaret" />
                          <Bar dataKey="ip_count" fill="#10b981" name="Unique IP" />
                        </BarChart>
                      </ResponsiveContainer>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-700 mb-3">Top 10 Ülke Detayı</h4>
                        {analytics.geographic_stats.slice(0, 10).map((country: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                              <div>
                                <div className="font-semibold text-gray-800">{country.country}</div>
                                <div className="text-xs text-gray-500">{country.ip_count} unique IPs</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-800">{country.total_visits}</div>
                              <div className="text-xs text-gray-500">ziyaret</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Coğrafi veri bulunamadı
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Conversion Analysis Tab */}
          {activeTab === 'conversion' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium opacity-90">Dönüşüm Oranı</div>
                      <div className="text-3xl font-bold mt-2">{analytics?.overview?.conversion_rate || 0}%</div>
                      <div className="text-xs mt-2 opacity-75">Form doldurma oranı</div>
                    </div>
                    <span className="text-5xl opacity-50">💰</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium opacity-90">Ortalama Süre</div>
                      <div className="text-3xl font-bold mt-2">2:45</div>
                      <div className="text-xs mt-2 opacity-75">Sitede kalma süresi</div>
                    </div>
                    <span className="text-5xl opacity-50">⏱️</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium opacity-90">Bounce Rate</div>
                      <div className="text-3xl font-bold mt-2">32.5%</div>
                      <div className="text-xs mt-2 opacity-75">Hemen çıkma oranı</div>
                    </div>
                    <span className="text-5xl opacity-50">📉</span>
                  </div>
                </div>
              </div>
              
              {/* Conversion Funnel */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📊</span> Dönüşüm Hunisi
                </h3>
                <div className="space-y-4">
                  {[
                    { stage: 'Sayfa Ziyareti', users: 10000, percentage: 100 },
                    { stage: 'Ürün İnceleme', users: 6500, percentage: 65 },
                    { stage: 'Sepete Ekleme', users: 3200, percentage: 32 },
                    { stage: 'Form Başlatma', users: 1800, percentage: 18 },
                    { stage: 'Form Tamamlama', users: 450, percentage: 4.5 }
                  ].map((stage, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">{stage.stage}</span>
                        <span className="text-sm text-gray-500">{stage.users.toLocaleString()} kullanıcı ({stage.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-8">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full flex items-center justify-end pr-3"
                          style={{ width: `${stage.percentage}%` }}
                        >
                          <span className="text-white text-xs font-semibold">{stage.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Real-time Tab */}
          {activeTab === 'realtime' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">⚡ Gerçek Zamanlı İzleme</h3>
                    <p className="text-sm opacity-90 mt-1">Son 5 dakikadaki aktiviteler</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm">Canlı</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <div className="text-sm text-gray-600">Aktif Kullanıcı</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">234</div>
                  <div className="text-xs text-green-600 mt-1">↑ 12 (son 1 dk)</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <div className="text-sm text-gray-600">Sayfa Görüntüleme</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">1,234</div>
                  <div className="text-xs text-blue-600 mt-1">↑ 89 (son 1 dk)</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                  <div className="text-sm text-gray-600">Form Doldurma</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">8</div>
                  <div className="text-xs text-yellow-600 mt-1">↑ 2 (son 1 dk)</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <div className="text-sm text-gray-600">Engellenen</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">45</div>
                  <div className="text-xs text-red-600 mt-1">↑ 5 (son 1 dk)</div>
                </div>
              </div>
              
              {/* Live Activity Feed */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📡</span> Canlı Aktivite Akışı
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {[
                    { time: '10 saniye önce', ip: '192.168.1.1', action: 'Form doldurdu', status: 'success' },
                    { time: '25 saniye önce', ip: '10.0.0.1', action: 'Bot olarak tespit edildi', status: 'danger' },
                    { time: '1 dakika önce', ip: '172.16.0.1', action: 'Sayfa ziyaret etti', status: 'info' },
                    { time: '2 dakika önce', ip: '192.168.2.5', action: 'Spam girişimi engellendi', status: 'warning' },
                    { time: '3 dakika önce', ip: '10.0.1.1', action: 'Whitelist\'e eklendi', status: 'success' }
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' :
                          activity.status === 'danger' ? 'bg-red-500' :
                          activity.status === 'warning' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}></div>
                        <div>
                          <span className="font-mono text-sm">{activity.ip}</span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="text-sm text-gray-700">{activity.action}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}