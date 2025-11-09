'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface N8nStats {
  total_workflows: number
  active_workflows: number
  total_executions_today: number
  successful_executions: number
  failed_executions: number
  total_webhooks: number
  webhook_calls_today: number
  total_errors_today: number
}

export default function N8nDashboardPage() {
  const [stats, setStats] = useState<N8nStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/n8n/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch n8n stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading n8n dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">n8n Dashboard</h1>
        <p className="text-gray-600">
          Monitor workflows, webhooks, and automation executions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Workflows"
          value={stats?.total_workflows || 0}
          icon="🔄"
          color="blue"
          link="/dashboard/n8n/workflows"
        />
        <StatCard
          title="Active Workflows"
          value={stats?.active_workflows || 0}
          icon="✅"
          color="green"
          link="/dashboard/n8n/workflows?status=active"
        />
        <StatCard
          title="Executions Today"
          value={stats?.total_executions_today || 0}
          icon="⚡"
          color="purple"
        />
        <StatCard
          title="Success Rate"
          value={
            stats && stats.total_executions_today > 0
              ? `${Math.round((stats.successful_executions / stats.total_executions_today) * 100)}%`
              : '0%'
          }
          icon="📊"
          color="indigo"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Webhooks"
          value={stats?.total_webhooks || 0}
          icon="📨"
          color="teal"
          link="/dashboard/n8n/webhooks"
        />
        <StatCard
          title="Webhook Calls Today"
          value={stats?.webhook_calls_today || 0}
          icon="📲"
          color="cyan"
          link="/dashboard/n8n/webhooks"
        />
        <StatCard
          title="Errors Today"
          value={stats?.total_errors_today || 0}
          icon="⚠️"
          color="red"
          link="/dashboard/n8n/errors"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickActionCard
          title="Manage Workflows"
          description="View and manage all n8n workflows"
          icon="🔄"
          link="/dashboard/n8n/workflows"
          color="blue"
        />
        <QuickActionCard
          title="Webhook Logs"
          description="Monitor webhook calls and responses"
          icon="📨"
          link="/dashboard/n8n/webhooks"
          color="green"
        />
        <QuickActionCard
          title="Error Logs"
          description="View and troubleshoot errors"
          icon="⚠️"
          link="/dashboard/n8n/errors"
          color="red"
        />
        <QuickActionCard
          title="Open n8n Panel"
          description="Access n8n workflow editor"
          icon="⚙️"
          link="https://n8n.dtektracking.com"
          color="purple"
          external
        />
        <QuickActionCard
          title="Execution History"
          description="View detailed execution logs"
          icon="📋"
          link="/dashboard/n8n/executions"
          color="indigo"
        />
        <QuickActionCard
          title="System Health"
          description="Check n8n system status"
          icon="💚"
          link="/dashboard/n8n/health"
          color="teal"
        />
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, link }: any) {
  const content = (
    <div className={`bg-white border-l-4 border-${color}-500 p-6 rounded-lg shadow hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-5xl opacity-80">{icon}</div>
      </div>
    </div>
  )

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    )
  }

  return content
}

function QuickActionCard({ title, description, icon, link, color, external }: any) {
  const content = (
    <div className={`bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-${color}-500`}>
      <div className="flex items-start gap-4">
        <div className="text-4xl">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {external && (
          <span className="text-gray-400 text-sm">↗</span>
        )}
      </div>
    </div>
  )

  if (external) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return (
    <Link href={link}>
      {content}
    </Link>
  )
}
