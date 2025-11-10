'use client'

import { useTranslation } from '@/lib/i18n'
import { FileText, DollarSign, TrendingUp, Package } from 'lucide-react'

export default function DashboardPage() {
  const t = useTranslation()

  const stats = [
    {
      label: t.dashboard.stats.totalLeads,
      value: '1,234',
      change: '+12%',
      icon: FileText,
      color: 'blue'
    },
    {
      label: t.dashboard.stats.pendingCommissions,
      value: '€2,450',
      change: '+8%',
      icon: Package,
      color: 'yellow'
    },
    {
      label: t.dashboard.stats.paidCommissions,
      value: '€15,890',
      change: '+23%',
      icon: DollarSign,
      color: 'green'
    },
    {
      label: t.dashboard.stats.conversionRate,
      value: '24.5%',
      change: '+3%',
      icon: TrendingUp,
      color: 'purple'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string, text: string, icon: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-600 dark:text-blue-400' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', icon: 'text-yellow-600 dark:text-yellow-400' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', icon: 'text-green-600 dark:text-green-400' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-600 dark:text-purple-400' }
    }
    return colors[color] || colors.blue
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t.dashboard.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">
          {t.dashboard.overview}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colors = getColorClasses(stat.color)
          
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <span className={`text-sm font-medium ${colors.text}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t.dashboard.quickActions}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/leads"
            className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center"
          >
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <p className="font-medium text-gray-900 dark:text-white">
              {t.dashboard.viewAllLeads}
            </p>
          </a>
          <a
            href="/dashboard/commissions"
            className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center"
          >
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <p className="font-medium text-gray-900 dark:text-white">
              {t.dashboard.viewCommissions}
            </p>
          </a>
          <button className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <p className="font-medium text-gray-900 dark:text-white">
              {t.dashboard.downloadReport}
            </p>
          </button>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t.dashboard.recentActivity}
        </h2>
        <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-center py-8">
          {t.common.loading}
        </p>
      </div>
    </div>
  )
}
