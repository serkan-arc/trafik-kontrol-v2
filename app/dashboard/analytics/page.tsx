'use client'

import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface OverviewData {
  overview: {
    total_requests: string
    avg_unique_ips: string
    bot_requests: string
    spam_attempts: string
    suspicious_requests: string
    blocked_requests: string
    challenged_requests: string
    avg_response_time: string
  }
  trend: Array<{
    hour_timestamp: string
    total_requests: number
    unique_ips: number
    bot_requests: number
    spam_attempts: number
    suspicious_requests: number
    blocked_requests: number
  }>
  top_domains: Array<{
    domain: string
    requests: number
  }>
}

interface SecurityData {
  events: Array<{
    event_type: string
    severity: string
    affected_domains: string[]
    involved_ips: string[]
    event_data: any
    auto_mitigated: boolean
    status: string
    detected_at: string
    resolved_at: string | null
  }>
  statistics: Array<{
    event_type: string
    severity: string
    count: string
    mitigated_count: string
    false_positives: string
  }>
  ip_reputation: Array<{
    list_type: string
    count: string
    avg_score: string
  }>
  top_triggered_rules: Array<{
    rule_id: string
    trigger_count: string
    unique_ips: string
  }>
}

interface ThreatsData {
  bot_statistics: Array<{
    bot_type: string
    detection_count: string
    unique_ips: string
    blocked_count: string
  }>
  spam_statistics: Array<{
    form_type: string
    detection_count: string
    avg_spam_score: string
    blocked_count: string
    disposable_emails: string
  }>
  attacking_ips: Array<{
    ip: string
    reputation_score: number
    list_type: string
    total_requests: number
    suspicious_requests: number
    country: string
    is_vpn: boolean
    is_proxy: boolean
    is_tor: boolean
  }>
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'threats' | 'geo'>('overview')
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [securityData, setSecurityData] = useState<SecurityData | null>(null)
  const [threatsData, setThreatsData] = useState<ThreatsData | null>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    fetchData()
  }, [activeTab, timeRange])
  
  const fetchData = async () => {
    setLoading(true)
    try {
      let metric = activeTab
      if (activeTab === 'threats') metric = 'threats'
      
      const response = await fetch(`/api/global/analytics?metric=${metric}&time_range=${timeRange}`)
      const data = await response.json()
      
      if (data.success) {
        if (activeTab === 'overview') {
          setOverviewData(data.data)
        } else if (activeTab === 'security') {
          setSecurityData(data.data)
        } else if (activeTab === 'threats') {
          setThreatsData(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
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
  
  const getEventTypeIcon = (eventType: string) => {
    const icons: Record<string, string> = {
      mass_attack: '⚔️',
      ddos_attempt: '💥',
      brute_force: '🔨',
      sql_injection: '💉',
      xss_attempt: '🎭',
      suspicious_spike: '📈',
      new_bot_detected: '🤖',
      rate_limit_exceeded: '⏱️'
    }
    return icons[eventType] || '🔔'
  }
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Advanced Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive system metrics and insights</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              timeRange === '24h'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            24 Hours
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              timeRange === '7d'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              timeRange === '30d'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📈 Overview
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🛡️ Security
          </button>
          <button
            onClick={() => setActiveTab('threats')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'threats'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            ⚠️ Threats
          </button>
          <button
            onClick={() => setActiveTab('geo')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'geo'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🌍 Geographic
          </button>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading analytics data...</div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && overviewData && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium">Total Requests</div>
                      <div className="text-3xl font-bold text-blue-900 mt-2">
                        {parseInt(overviewData.overview.total_requests || '0').toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Avg {parseInt(overviewData.overview.avg_unique_ips || '0').toLocaleString()} unique IPs/hour
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                      <div className="text-sm text-orange-600 font-medium">Bot Requests</div>
                      <div className="text-3xl font-bold text-orange-900 mt-2">
                        {parseInt(overviewData.overview.bot_requests || '0').toLocaleString()}
                      </div>
                      <div className="text-xs text-orange-600 mt-1">
                        {overviewData.overview.total_requests
                          ? ((parseInt(overviewData.overview.bot_requests || '0') / parseInt(overviewData.overview.total_requests)) * 100).toFixed(1)
                          : 0}% of total
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
                      <div className="text-sm text-red-600 font-medium">Threats Detected</div>
                      <div className="text-3xl font-bold text-red-900 mt-2">
                        {(parseInt(overviewData.overview.spam_attempts || '0') + 
                          parseInt(overviewData.overview.suspicious_requests || '0')).toLocaleString()}
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        {parseInt(overviewData.overview.blocked_requests || '0').toLocaleString()} blocked
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                      <div className="text-sm text-green-600 font-medium">Avg Response Time</div>
                      <div className="text-3xl font-bold text-green-900 mt-2">
                        {parseFloat(overviewData.overview.avg_response_time || '0').toFixed(0)}ms
                      </div>
                      <div className="text-xs text-green-600 mt-1">Performance metric</div>
                    </div>
                  </div>
                  
                  {/* Traffic Trend Chart */}
                  {overviewData.trend && overviewData.trend.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Trend</h3>
                      <div className="h-64">
                        <Line
                          data={{
                            labels: overviewData.trend.map(t => 
                              new Date(t.hour_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            ),
                            datasets: [
                              {
                                label: 'Total Requests',
                                data: overviewData.trend.map(t => t.total_requests),
                                borderColor: 'rgb(59, 130, 246)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                fill: true,
                                tension: 0.4
                              },
                              {
                                label: 'Bot Requests',
                                data: overviewData.trend.map(t => t.bot_requests),
                                borderColor: 'rgb(249, 115, 22)',
                                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                                fill: true,
                                tension: 0.4
                              },
                              {
                                label: 'Suspicious',
                                data: overviewData.trend.map(t => t.suspicious_requests),
                                borderColor: 'rgb(239, 68, 68)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                fill: true,
                                tension: 0.4
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top'
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Top Domains */}
                  {overviewData.top_domains && overviewData.top_domains.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Domains</h3>
                      <div className="space-y-3">
                        {overviewData.top_domains.map((domain, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                                {index + 1}
                              </div>
                              <div className="font-medium text-gray-900">{domain.domain}</div>
                            </div>
                            <div className="text-sm text-gray-600">{domain.requests.toLocaleString()} requests</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Security Tab */}
              {activeTab === 'security' && securityData && (
                <div className="space-y-6">
                  {/* Security Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-600">Total Events</div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {securityData.events.length}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {securityData.events.filter(e => e.auto_mitigated).length} auto-mitigated
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-600">IP Reputation</div>
                      <div className="space-y-1 mt-2">
                        {securityData.ip_reputation.map(rep => (
                          <div key={rep.list_type} className="flex justify-between text-sm">
                            <span className="text-gray-700 capitalize">{rep.list_type}:</span>
                            <span className="font-semibold">{rep.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-600">Top Rules Triggered</div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {securityData.top_triggered_rules.length}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Active rule violations</div>
                    </div>
                  </div>
                  
                  {/* Security Events */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Events</h3>
                    <div className="space-y-3">
                      {securityData.events.slice(0, 10).map((event, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">{getEventTypeIcon(event.event_type)}</div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {event.event_type.replace(/_/g, ' ').toUpperCase()}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {event.affected_domains.length > 0 && (
                                    <span>Affected: {event.affected_domains.join(', ')}</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(event.detected_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${getSeverityColor(event.severity)}`}>
                                {event.severity.toUpperCase()}
                              </span>
                              {event.auto_mitigated && (
                                <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 font-medium">
                                  ✓ Mitigated
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Event Type Statistics */}
                  {securityData.statistics.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Statistics</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Event Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Severity</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Count</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Mitigated</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">False Positives</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {securityData.statistics.map((stat, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {stat.event_type.replace(/_/g, ' ')}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${getSeverityColor(stat.severity)}`}>
                                    {stat.severity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{stat.count}</td>
                                <td className="px-4 py-3 text-sm text-green-600">{stat.mitigated_count}</td>
                                <td className="px-4 py-3 text-sm text-orange-600">{stat.false_positives}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Threats Tab */}
              {activeTab === 'threats' && threatsData && (
                <div className="space-y-6">
                  {/* Bot Statistics */}
                  {threatsData.bot_statistics.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 Bot Activity</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Bot Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Detections</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Unique IPs</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Blocked</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Block Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {threatsData.bot_statistics.map((bot, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3">
                                  <span className={`text-sm font-medium ${
                                    bot.bot_type === 'good' ? 'text-green-600' :
                                    bot.bot_type === 'bad' ? 'text-red-600' :
                                    'text-gray-600'
                                  }`}>
                                    {bot.bot_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                  {parseInt(bot.detection_count).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{bot.unique_ips}</td>
                                <td className="px-4 py-3 text-sm text-red-600">{bot.blocked_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {((parseInt(bot.blocked_count) / parseInt(bot.detection_count)) * 100).toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Spam Statistics */}
                  {threatsData.spam_statistics.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">🚫 Spam Activity</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Form Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Detections</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Avg Score</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Blocked</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Disposable Emails</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {threatsData.spam_statistics.map((spam, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm text-gray-900">{spam.form_type || 'Unknown'}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                  {parseInt(spam.detection_count).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {parseFloat(spam.avg_spam_score).toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-red-600">{spam.blocked_count}</td>
                                <td className="px-4 py-3 text-sm text-orange-600">{spam.disposable_emails}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Attacking IPs */}
                  {threatsData.attacking_ips.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Top Attacking IPs</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">IP Address</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Country</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Reputation</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Total Requests</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Suspicious</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Flags</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {threatsData.attacking_ips.map((ip, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3">
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{ip.ip}</code>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{ip.country || 'Unknown'}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-sm font-bold ${
                                    ip.reputation_score < 30 ? 'text-red-600' :
                                    ip.reputation_score < 60 ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {ip.reputation_score}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {ip.total_requests.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-red-600">
                                  {ip.suspicious_requests.toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 text-xs">
                                    {ip.is_vpn && <span className="px-1 py-0.5 rounded bg-purple-50 text-purple-600">VPN</span>}
                                    {ip.is_proxy && <span className="px-1 py-0.5 rounded bg-orange-50 text-orange-600">Proxy</span>}
                                    {ip.is_tor && <span className="px-1 py-0.5 rounded bg-red-50 text-red-600">Tor</span>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Geographic Tab */}
              {activeTab === 'geo' && (
                <div className="text-center py-12">
                  <div className="text-gray-500">Geographic analytics coming soon...</div>
                  <div className="text-sm text-gray-400 mt-2">
                    This feature requires GeoIP integration (Task 6)
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
