'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Workflow {
  id: string
  name: string
  status: 'active' | 'inactive'
  nodes_count: number
  last_execution: string | null
  execution_count: number
  success_count: number
  error_count: number
  created_at: string
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/n8n/workflows')
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.workflows || [])
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredWorkflows = workflows.filter(w => {
    if (filter === 'all') return true
    return w.status === filter
  })

  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.status === 'active').length,
    inactive: workflows.filter(w => w.status === 'inactive').length,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <a
            href="https://n8n.dtektracking.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>Open n8n Editor</span>
            <span className="text-xs">↗</span>
          </a>
        </div>
        <p className="text-gray-600">
          Manage and monitor all n8n automation workflows
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Workflows</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-400">
          <div className="text-sm text-gray-600 mb-1">Inactive</div>
          <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'inactive'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactive ({stats.inactive})
          </button>
        </div>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading workflows...</div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">🔄</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Workflows Found</h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all' 
              ? 'No workflows have been created yet.'
              : `No ${filter} workflows found.`
            }
          </p>
          <a
            href="https://n8n.dtektracking.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <span>Create Workflow in n8n</span>
            <span>↗</span>
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const successRate = workflow.execution_count > 0
    ? Math.round((workflow.success_count / workflow.execution_count) * 100)
    : 0

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{workflow.name}</h3>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                workflow.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {workflow.status === 'active' ? '✅ Active' : '⭕ Inactive'}
            </span>
            <span className="text-xs text-gray-500">
              {workflow.nodes_count} nodes
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Executions:</span>
          <span className="font-medium">{workflow.execution_count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Success Rate:</span>
          <span className={`font-medium ${successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {successRate}%
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Run:</span>
          <span className="font-medium">
            {workflow.last_execution
              ? new Date(workflow.last_execution).toLocaleDateString()
              : 'Never'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={`https://n8n.dtektracking.com/workflow/${workflow.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-indigo-50 text-indigo-600 px-3 py-2 rounded text-sm font-medium hover:bg-indigo-100 transition-colors text-center"
        >
          Edit ⚙️
        </a>
        <Link
          href={`/dashboard/n8n/workflows/${workflow.id}/executions`}
          className="flex-1 bg-gray-50 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors text-center"
        >
          Logs 📋
        </Link>
      </div>
    </div>
  )
}
