'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MasterDashboardData {
  overview: {
    total_domains: number
    total_visits: number
    unique_visitors_today: number
    total_bots_detected: number
  }
  hourly_traffic: Array<{ hour: number; visits: number }>
  top_domains: Array<{ domain: string; visits: number; visitors_today: number }>
  top_ips: Array<{ ip: string; visits: number }>
  recent_activity: Array<{
    domain: string
    ip: string
    path: string
    user_agent: string
    timestamp: string
  }>
}

export default function TrafficOverviewPage() {
  const [dashboardData, setDashboardData] = useState<MasterDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardAnalytics()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardAnalytics = async () => {
    try {
      const response = await fetch('/api/traffic/analytics/master-dashboard', {
        cache: 'no-store'
      })
      const data = await response.json()
      
      console.log('📊 Dashboard Data:', data)
      console.log('📈 Recent Activity Count:', data.data?.recent_activity?.length)
      
      if (data.success) {
        setDashboardData(data.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Dashboard yüklenemedi</p>
          <button 
            onClick={fetchDashboardAnalytics}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  const maxHourlyVisits = Math.max(...dashboardData.hourly_traffic.map(h => h.visits), 1)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🚦 Traffic Overview
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Tüm domainlerin gerçek zamanlı traffic analizi
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Canlı
          </div>
        </div>
      </div>

      {/* Overview Stats - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Aktif Domain</p>
          <p className="text-2xl font-bold text-gray-900">{dashboardData.overview.total_domains}</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Toplam Ziyaret</p>
          <p className="text-2xl font-bold text-gray-900">
            {dashboardData.overview.total_visits.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Bugün Ziyaretçi</p>
          <p className="text-2xl font-bold text-blue-600">
            {dashboardData.overview.unique_visitors_today}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Bot Engellendi</p>
          <p className="text-2xl font-bold text-red-600">
            {dashboardData.overview.total_bots_detected}
          </p>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Traffic Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">📈 Son 24 Saat</h3>
            <span className="text-xs text-gray-500">Otomatik güncelleniyor</span>
          </div>
          
          {dashboardData.hourly_traffic.filter(h => h.visits > 0).length > 0 ? (
            <div className="h-64 flex items-end justify-between gap-1 px-2">
              {dashboardData.hourly_traffic.map((item) => {
                const height = item.visits > 0 ? (item.visits / maxHourlyVisits) * 100 : 0;
                const isCurrentHour = new Date().getHours() === item.hour;
                
                return (
                  <div key={item.hour} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative group w-full flex flex-col justify-end" style={{ height: '240px' }}>
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 min-h-[4px] ${
                          isCurrentHour 
                            ? 'bg-gradient-to-t from-indigo-600 to-purple-500 shadow-lg' 
                            : item.visits > 0 
                              ? 'bg-gradient-to-t from-indigo-500 to-indigo-300 hover:from-indigo-600 hover:to-purple-400 cursor-pointer' 
                              : 'bg-gray-200'
                        }`}
                        style={{ height: `${Math.max(height, 1.5)}%` }}
                      >
                        {/* Tooltip on hover */}
                        {item.visits > 0 && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                              <div className="font-bold">{item.visits} ziyaret</div>
                              <div className="text-gray-300">{String(item.hour).padStart(2, '0')}:00</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] ${isCurrentHour ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>
                      {String(item.hour).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-400">Henüz trafik yok</p>
            </div>
          )}
          
          {/* Summary stats below chart */}
          {dashboardData.hourly_traffic.filter(h => h.visits > 0).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-500">En Yoğun: </span>
                <span className="font-semibold text-gray-900">
                  {String(dashboardData.hourly_traffic.reduce((max, curr) => 
                    curr.visits > max.visits ? curr : max
                  ).hour).padStart(2, '0')}:00
                </span>
              </div>
              <div>
                <span className="text-gray-500">Toplam: </span>
                <span className="font-semibold text-gray-900">
                  {dashboardData.hourly_traffic.reduce((sum, curr) => sum + curr.visits, 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Top Domains */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">🏆 En Çok Trafik Alan Domainler</h3>
          </div>
          <div className="space-y-3">
            {dashboardData.top_domains.slice(0, 5).map((domain, index) => (
              <Link
                key={domain.domain}
                href={`/dashboard/traffic/domain/${domain.domain}`}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:from-indigo-50 hover:to-purple-50 border border-gray-200 hover:border-indigo-300 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {domain.domain}
                    </p>
                    <p className="text-xs text-gray-500">
                      Bugün: {domain.visitors_today} ziyaretçi
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    {domain.visits.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 block">ziyaret</span>
                </div>
              </Link>
            ))}
            {dashboardData.top_domains.length === 0 && (
              <p className="text-center text-gray-400 py-8">Henüz domain yok</p>
            )}
          </div>
        </div>

        {/* Top IPs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🌐 En Aktif IP'ler</h3>
            <span className="text-xs text-gray-500">Son 24 saat</span>
          </div>
          <div className="space-y-1">
            {dashboardData.top_ips.slice(0, 10).map((item, index) => {
              // Medal colors for top 3
              const medalColor = index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                index === 1 ? 'bg-gray-100 text-gray-600' :
                                index === 2 ? 'bg-orange-100 text-orange-600' :
                                'bg-gray-50 text-gray-500';
              
              return (
                <div 
                  key={item.ip} 
                  className="flex items-center justify-between py-2 px-3 rounded hover:bg-indigo-50 transition-colors group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded ${medalColor}`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-mono text-gray-700 truncate">
                      {item.ip}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600 ml-2">
                    {item.visits}
                  </span>
                </div>
              );
            })}
            {dashboardData.top_ips.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Henüz trafik yok</p>
            )}
          </div>
        </div>

        {/* Live Activity Feed - Scatter Plot Graph */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">⚡ Canlı Aktivite Grafiği</h3>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">CANLI</span>
            </div>
          </div>
          
          {dashboardData.recent_activity.length > 0 ? (
            <div className="relative">
              {/* Graph Container */}
              <div className="relative h-80 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-4">
                {/* Y-axis label */}
                <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 -rotate-90">
                  <span className="text-xs font-medium text-gray-600">Aktivite Sayısı</span>
                </div>

                {/* Grid lines */}
                <div className="absolute inset-4 pointer-events-none">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i}
                      className="absolute w-full border-t border-gray-100"
                      style={{ bottom: `${(i / 5) * 100}%` }}
                    >
                      <span className="absolute -left-8 -translate-y-1/2 text-[10px] text-gray-400">
                        {Math.round((dashboardData.recent_activity.length / 5) * i)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Vertical time grid */}
                <div className="absolute inset-4 pointer-events-none">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i}
                      className="absolute h-full border-l border-gray-100"
                      style={{ left: `${(i / 5) * 100}%` }}
                    />
                  ))}
                </div>

                {/* Plot Area */}
                <div className="relative h-full pt-2 pb-8 px-4">
                  {(() => {
                    // Calculate time range (last 15 minutes - increased for better visibility)
                    const now = Date.now();
                    const timeWindow = 15 * 60 * 1000; // 15 minutes (was 5)
                    const oldestTime = now - timeWindow;
                    
                    console.log('🕐 Time Window:', {
                      now: new Date(now).toLocaleTimeString(),
                      oldestTime: new Date(oldestTime).toLocaleTimeString(),
                      windowMinutes: timeWindow / 60000,
                      activityCount: dashboardData.recent_activity.length
                    });

                    // Group activities into time buckets (45-second intervals for 15min window)
                    const bucketSize = 45 * 1000; // 45 seconds
                    const buckets: Record<number, { normal: number; suspicious: number; activities: typeof dashboardData.recent_activity }> = {};

                    let skippedOld = 0;
                    let includedNew = 0;
                    
                    dashboardData.recent_activity.forEach(activity => {
                      const timestamp = new Date(activity.timestamp).getTime();
                      const age = now - timestamp;
                      
                      // Only include activities within the time window
                      if (age > timeWindow) {
                        skippedOld++;
                        return; // Skip activities older than 15 minutes
                      }
                      
                      includedNew++;
                      const bucketIndex = Math.floor((timestamp - oldestTime) / bucketSize);
                      
                      if (!buckets[bucketIndex]) {
                        buckets[bucketIndex] = { normal: 0, suspicious: 0, activities: [] };
                      }

                      const isSuspicious = activity.path.includes('wp-admin') || 
                                         activity.path.includes('wordpress') ||
                                         activity.path.includes('.git') ||
                                         activity.path.includes('xmlrpc');

                      if (isSuspicious) {
                        buckets[bucketIndex].suspicious++;
                      } else {
                        buckets[bucketIndex].normal++;
                      }
                      
                      buckets[bucketIndex].activities.push(activity);
                    });
                    
                    console.log('📊 Activity filtering:', {
                      total: dashboardData.recent_activity.length,
                      skipped: skippedOld,
                      included: includedNew,
                      buckets: Object.keys(buckets).length
                    });

                    // Convert to array for plotting
                    const maxBuckets = Math.ceil(timeWindow / bucketSize);
                    const plotData = Array.from({ length: maxBuckets }, (_, i) => {
                      const bucket = buckets[i] || { normal: 0, suspicious: 0, activities: [] };
                      const total = bucket.normal + bucket.suspicious;
                      const xPosition = (i / maxBuckets) * 100;
                      
                      return {
                        x: xPosition,
                        normal: bucket.normal,
                        suspicious: bucket.suspicious,
                        total,
                        activities: bucket.activities,
                        bucketIndex: i
                      };
                    });

                    const maxActivity = Math.max(...plotData.map(d => d.total), 1);

                    return (
                      <>
                        {/* Area fill for normal traffic */}
                        <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ paddingBottom: '32px', paddingTop: '8px' }}>
                          <defs>
                            <linearGradient id="normalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.05"/>
                            </linearGradient>
                            <linearGradient id="suspiciousGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.4"/>
                              <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.1"/>
                            </linearGradient>
                          </defs>
                          
                          {/* Normal traffic area */}
                          <path
                            d={`M 0,${((1 - plotData[0].normal / maxActivity) * 100)}% ${
                              plotData.map(d => `L ${d.x}%,${((1 - d.normal / maxActivity) * 100)}%`).join(' ')
                            } L 100%,100% L 0,100% Z`}
                            fill="url(#normalGradient)"
                            className="transition-all duration-500"
                          />
                          
                          {/* Suspicious traffic area (stacked on top) */}
                          <path
                            d={`M 0,${((1 - (plotData[0].normal + plotData[0].suspicious) / maxActivity) * 100)}% ${
                              plotData.map(d => `L ${d.x}%,${((1 - (d.normal + d.suspicious) / maxActivity) * 100)}%`).join(' ')
                            } ${
                              plotData.slice().reverse().map(d => `L ${d.x}%,${((1 - d.normal / maxActivity) * 100)}%`).join(' ')
                            } Z`}
                            fill="url(#suspiciousGradient)"
                            className="transition-all duration-500"
                          />

                          {/* Lines */}
                          <polyline
                            points={plotData.map(d => `${d.x}%,${((1 - d.normal / maxActivity) * 100)}%`).join(' ')}
                            fill="none"
                            stroke="rgb(99, 102, 241)"
                            strokeWidth="2"
                            className="transition-all duration-500"
                          />
                          
                          <polyline
                            points={plotData.map(d => `${d.x}%,${((1 - (d.normal + d.suspicious) / maxActivity) * 100)}%`).join(' ')}
                            fill="none"
                            stroke="rgb(239, 68, 68)"
                            strokeWidth="2"
                            className="transition-all duration-500"
                          />
                        </svg>

                        {/* Data points with hover */}
                        {plotData.map((point, idx) => {
                          if (point.total === 0) return null;
                          
                          const normalY = ((1 - point.normal / maxActivity) * 100);
                          const totalY = ((1 - point.total / maxActivity) * 100);

                          return (
                            <div key={idx}>
                              {/* Normal traffic point */}
                              {point.normal > 0 && (
                                <div
                                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group/point cursor-pointer z-10"
                                  style={{ left: `${point.x}%`, top: `${normalY}%` }}
                                >
                                  <div className="w-3 h-3 bg-indigo-500 border-2 border-white rounded-full shadow-lg group-hover/point:scale-150 transition-transform"></div>
                                  
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-gray-900 text-white text-[10px] rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                                      <div className="font-bold text-indigo-400">{point.normal} normal istek</div>
                                      <div className="text-gray-300">
                                        {Math.floor((point.bucketIndex * 45) / 60)} dk önce
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Suspicious traffic point */}
                              {point.suspicious > 0 && (
                                <div
                                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group/point cursor-pointer z-10"
                                  style={{ left: `${point.x}%`, top: `${totalY}%` }}
                                >
                                  <div className="w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-lg animate-pulse group-hover/point:scale-150 transition-transform"></div>
                                  
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none z-20">
                                    <div className="bg-gray-900 text-white text-[10px] rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                                      <div className="font-bold text-red-400">⚠️ {point.suspicious} şüpheli istek</div>
                                      <div className="text-gray-300">
                                        {Math.floor((point.bucketIndex * 45) / 60)} dk önce
                                      </div>
                                      {point.activities.slice(0, 3).map((act, i) => (
                                        <div key={i} className="text-gray-400 text-[9px] truncate max-w-[150px] mt-1">
                                          {act.domain}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-4 right-4 flex justify-between text-[10px] text-gray-400">
                  <span>-15m</span>
                  <span>-12m</span>
                  <span>-9m</span>
                  <span>-6m</span>
                  <span>-3m</span>
                  <span className="text-green-600 font-bold">ŞİMDİ</span>
                </div>
              </div>

              {/* X-axis label */}
              <div className="text-center mt-2">
                <span className="text-xs font-medium text-gray-600">Zaman (Son 15 Dakika)</span>
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-gray-600">Normal Trafik</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600">Şüpheli Aktivite</span>
                </div>
                <div className="text-gray-400">
                  Toplam: {dashboardData.recent_activity.length} istek
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-5xl mb-4 opacity-20">📊</div>
              <p className="text-gray-400 text-sm">Henüz aktivite yok</p>
              <p className="text-gray-300 text-xs mt-1">Trafik geldiğinde grafik burada görünecek</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/traffic/master"
          className="block bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow border border-indigo-200 p-6 hover:shadow-lg hover:from-indigo-100 hover:to-purple-100 transition-all group"
        >
          <div className="text-3xl mb-3">🎛️</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600">
            Master Control
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Domain yönetimi ve merkezi kontrol paneli
          </p>
          <div className="mt-4 text-indigo-600 text-sm font-medium flex items-center gap-1">
            Panele Git <span>→</span>
          </div>
        </Link>

        <Link
          href="/dashboard/traffic/ips"
          className="block bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow border border-blue-200 p-6 hover:shadow-lg hover:from-blue-100 hover:to-cyan-100 transition-all group"
        >
          <div className="text-3xl mb-3">🔍</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
            IP Management
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            IP listelerini yönet, whitelist/blacklist işlemleri
          </p>
          <div className="mt-4 text-blue-600 text-sm font-medium flex items-center gap-1">
            Yönet <span>→</span>
          </div>
        </Link>

        <Link
          href="/dashboard/traffic/analytics"
          className="block bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow border border-purple-200 p-6 hover:shadow-lg hover:from-purple-100 hover:to-pink-100 transition-all group"
        >
          <div className="text-3xl mb-3">📊</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600">
            Analytics
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Detaylı raporlar ve gelişmiş analiz araçları
          </p>
          <div className="mt-4 text-purple-600 text-sm font-medium flex items-center gap-1">
            İncele <span>→</span>
          </div>
        </Link>
      </div>
    </div>
  )
}