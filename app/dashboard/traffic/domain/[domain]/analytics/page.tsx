'use client'

import { useState, useEffect, use } from 'react'
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AnalyticsData {
  hourly_traffic: Array<{
    hour: string
    visits: number
    unique_visitors: number
    bots_blocked: number
    spam_blocked: number
  }>
  daily_trends: Array<{
    date: string
    total_requests: number
    unique_ips: number
    threats_blocked: number
  }>
  geographic_distribution: Array<{
    country: string
    country_code: string
    visits: number
    percentage: number
  }>
  top_paths: Array<{
    path: string
    visits: number
    avg_response_time: number
  }>
  bot_analysis: {
    good_bots: number
    bad_bots: number
    unknown_bots: number
    top_bots: Array<{ name: string; count: number }>
  }
  security_metrics: {
    total_threats: number
    blocked_ips: number
    spam_attempts: number
    attack_patterns: Array<{ type: string; count: number }>
  }
  performance_metrics: {
    avg_response_time: number
    uptime_percentage: number
    error_rate: number
    cache_hit_rate: number
  }
}

export default function DomainAnalytics({ params }: { params: Promise<{ domain: string }> }) {
  const resolvedParams = use(params)
  const domain = resolvedParams.domain
  
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState('24h')
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/analytics?range=${timeRange}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalyticsData(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [domain, timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Prepare chart data
  const trafficChartData = {
    labels: analyticsData?.hourly_traffic.map(h => h.hour) || [],
    datasets: [
      {
        label: 'Ziyaretler',
        data: analyticsData?.hourly_traffic.map(h => h.visits) || [],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Benzersiz Ziyaretçiler',
        data: analyticsData?.hourly_traffic.map(h => h.unique_visitors) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  const threatChartData = {
    labels: analyticsData?.hourly_traffic.map(h => h.hour) || [],
    datasets: [
      {
        label: 'Engellenen Botlar',
        data: analyticsData?.hourly_traffic.map(h => h.bots_blocked) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      },
      {
        label: 'Engellenen Spam',
        data: analyticsData?.hourly_traffic.map(h => h.spam_blocked) || [],
        backgroundColor: 'rgba(249, 115, 22, 0.7)',
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 1
      }
    ]
  }

  const geoChartData = {
    labels: analyticsData?.geographic_distribution.slice(0, 5).map(g => g.country) || [],
    datasets: [{
      label: 'Ziyaret Sayısı',
      data: analyticsData?.geographic_distribution.slice(0, 5).map(g => g.visits) || [],
      backgroundColor: [
        'rgba(99, 102, 241, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(249, 115, 22, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(236, 72, 153, 0.7)'
      ],
      borderColor: [
        'rgb(99, 102, 241)',
        'rgb(34, 197, 94)',
        'rgb(249, 115, 22)',
        'rgb(168, 85, 247)',
        'rgb(236, 72, 153)'
      ],
      borderWidth: 1
    }]
  }

  const botChartData = {
    labels: ['İyi Botlar', 'Kötü Botlar', 'Bilinmeyen'],
    datasets: [{
      data: [
        analyticsData?.bot_analysis.good_bots || 0,
        analyticsData?.bot_analysis.bad_bots || 0,
        analyticsData?.bot_analysis.unknown_bots || 0
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(156, 163, 175, 0.7)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(239, 68, 68)',
        'rgb(156, 163, 175)'
      ],
      borderWidth: 1
    }]
  }

  const performanceData = {
    labels: ['Response Time', 'Uptime', 'Cache Hit', 'Success Rate'],
    datasets: [{
      label: 'Performance Metrics',
      data: [
        analyticsData?.performance_metrics.avg_response_time || 0,
        analyticsData?.performance_metrics.uptime_percentage || 0,
        analyticsData?.performance_metrics.cache_hit_rate || 0,
        100 - (analyticsData?.performance_metrics.error_rate || 0)
      ],
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: 'rgb(99, 102, 241)',
      pointBackgroundColor: 'rgb(99, 102, 241)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(99, 102, 241)'
    }]
  }

  const tabs = [
    { id: 'overview', label: 'Genel Bakış', icon: '📊' },
    { id: 'traffic', label: 'Trafik Analizi', icon: '📈' },
    { id: 'security', label: 'Güvenlik', icon: '🛡️' },
    { id: 'geographic', label: 'Coğrafi Dağılım', icon: '🌍' },
    { id: 'performance', label: 'Performans', icon: '⚡' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📈 Analytics Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">{domain} için detaylı analiz ve raporlar</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="24h">Son 24 Saat</option>
              <option value="7d">Son 7 Gün</option>
              <option value="30d">Son 30 Gün</option>
              <option value="90d">Son 90 Gün</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Toplam Tehdit</p>
              <p className="text-2xl font-bold text-red-600">
                {analyticsData?.security_metrics.total_threats || 0}
              </p>
            </div>
            <span className="text-2xl">🚫</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ortalama Yanıt</p>
              <p className="text-2xl font-bold text-green-600">
                {analyticsData?.performance_metrics.avg_response_time || 0}ms
              </p>
            </div>
            <span className="text-2xl">⚡</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-blue-600">
                {analyticsData?.performance_metrics.uptime_percentage || 100}%
              </p>
            </div>
            <span className="text-2xl">✅</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Cache Hit</p>
              <p className="text-2xl font-bold text-purple-600">
                {analyticsData?.performance_metrics.cache_hit_rate || 0}%
              </p>
            </div>
            <span className="text-2xl">💾</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Trafik Trendi</h3>
                <Line data={trafficChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' as const }
                  }
                }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Bot Dağılımı</h3>
                <Doughnut data={botChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' as const }
                  }
                }} />
              </div>
            </div>
          )}

          {activeTab === 'traffic' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Saatlik Trafik Analizi</h3>
                <Line data={trafficChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' as const }
                  }
                }} />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">En Çok Ziyaret Edilen Sayfalar</h3>
                <div className="space-y-2">
                  {analyticsData?.top_paths.map((path, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-gray-600">{path.path}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {path.avg_response_time}ms
                        </span>
                      </div>
                      <span className="text-sm font-semibold">{path.visits} ziyaret</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Güvenlik Tehditleri</h3>
                <Bar data={threatChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' as const }
                  }
                }} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Saldırı Türleri</h4>
                  <div className="space-y-2">
                    {analyticsData?.security_metrics.attack_patterns.map((pattern, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{pattern.type}</span>
                        <span className="text-sm font-semibold text-red-600">{pattern.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Top Botlar</h4>
                  <div className="space-y-2">
                    {analyticsData?.bot_analysis.top_bots.map((bot, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{bot.name}</span>
                        <span className="text-sm font-semibold">{bot.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'geographic' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Ülkelere Göre Dağılım</h3>
                <Bar data={geoChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  }
                }} />
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Detaylı Ülke Listesi</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Ülke</th>
                        <th className="text-right py-2">Ziyaret</th>
                        <th className="text-right py-2">Oran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData?.geographic_distribution.map((geo, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">
                            <span className="mr-2">{geo.country_code}</span>
                            {geo.country}
                          </td>
                          <td className="text-right py-2">{geo.visits}</td>
                          <td className="text-right py-2">{geo.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Performans Metrikleri</h3>
                <Radar data={performanceData} options={{
                  responsive: true,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100
                    }
                  },
                  plugins: {
                    legend: { display: false }
                  }
                }} />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700">Response Time</p>
                  <p className="text-xl font-bold text-green-900">
                    {analyticsData?.performance_metrics.avg_response_time || 0}ms
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">Uptime</p>
                  <p className="text-xl font-bold text-blue-900">
                    {analyticsData?.performance_metrics.uptime_percentage || 100}%
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-700">Cache Hit Rate</p>
                  <p className="text-xl font-bold text-purple-900">
                    {analyticsData?.performance_metrics.cache_hit_rate || 0}%
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-700">Error Rate</p>
                  <p className="text-xl font-bold text-orange-900">
                    {analyticsData?.performance_metrics.error_rate || 0}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}