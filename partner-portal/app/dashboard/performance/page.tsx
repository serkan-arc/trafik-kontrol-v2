'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Calendar } from 'lucide-react'

interface PerformanceData {
  total_leads: number
  converted_leads: number
  conversion_rate: number
  total_commission: number
  avg_commission: number
  top_offer: string
  top_offer_count: number
  this_month_leads: number
  last_month_leads: number
  month_growth: number
}

export default function PerformancePage() {
  const t = useTranslation()
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    fetchPerformance()
  }, [period])

  const fetchPerformance = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('partner_token')
      const response = await fetch(`/api/performance?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching performance:', error)
      // Mock data for now
      setData({
        total_leads: 1234,
        converted_leads: 302,
        conversion_rate: 24.5,
        total_commission: 15890.50,
        avg_commission: 52.61,
        top_offer: 'ESV-FRX-2025',
        top_offer_count: 145,
        this_month_leads: 186,
        last_month_leads: 162,
        month_growth: 14.8
      })
    } finally {
      setLoading(false)
    }
  }

  const metrics = data ? [
    {
      label: t.performance.metrics.totalLeads,
      value: data.total_leads.toLocaleString(),
      change: `+${data.month_growth.toFixed(1)}%`,
      positive: true,
      icon: Target
    },
    {
      label: t.performance.metrics.convertedLeads,
      value: data.converted_leads.toLocaleString(),
      change: `${data.conversion_rate.toFixed(1)}%`,
      positive: true,
      icon: TrendingUp
    },
    {
      label: t.performance.metrics.avgCommission,
      value: `€${data.avg_commission.toFixed(2)}`,
      change: '+12%',
      positive: true,
      icon: DollarSign
    },
    {
      label: t.performance.metrics.topOffer,
      value: data.top_offer,
      change: `${data.top_offer_count} leads`,
      positive: true,
      icon: Award
    }
  ] : []

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t.performance.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">
            {t.performance.overview}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg shadow p-1">
          {['today', 'week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t.performance.period[p as keyof typeof t.performance.period]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      metric.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {metric.positive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{metric.change}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm mb-1">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Leads Over Time Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t.performance.charts.leadsOverTime}
              </h2>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">
                    Chart placeholder
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    (Integration with chart library needed)
                  </p>
                </div>
              </div>
            </div>

            {/* Conversion Rate Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t.performance.charts.conversionRate}
              </h2>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">
                    Chart placeholder
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    (Integration with chart library needed)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          {data && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow p-8 text-white">
              <h2 className="text-2xl font-bold mb-6">
                {t.dashboard.stats.thisMonth}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-blue-100 mb-2">{t.dashboard.stats.totalLeads}</p>
                  <p className="text-4xl font-bold">{data.this_month_leads}</p>
                  <p className="text-sm text-blue-100 mt-1">
                    {t.dashboard.stats.lastMonth}: {data.last_month_leads}
                  </p>
                </div>
                <div>
                  <p className="text-blue-100 mb-2">{t.performance.metrics.conversionRate}</p>
                  <p className="text-4xl font-bold">{data.conversion_rate.toFixed(1)}%</p>
                  <p className="text-sm text-blue-100 mt-1">
                    {data.converted_leads} / {data.total_leads} leads
                  </p>
                </div>
                <div>
                  <p className="text-blue-100 mb-2">{t.dashboard.stats.totalEarnings}</p>
                  <p className="text-4xl font-bold">€{data.total_commission.toLocaleString()}</p>
                  <p className="text-sm text-blue-100 mt-1">
                    Avg: €{data.avg_commission.toFixed(2)} / lead
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
