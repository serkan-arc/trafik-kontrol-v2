'use client'

import { useEffect, useState } from 'react'

interface WebhookLog {
  id: string
  webhook_url: string
  method: string
  status_code: number
  request_body: any
  response_body: any
  execution_time_ms: number
  created_at: string
}

export default function WebhooksPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)
  const [filters, setFilters] = useState({
    method: '',
    status: '',
    date_from: '',
    date_to: '',
  })

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.method) params.append('method', filters.method)
      if (filters.status) params.append('status', filters.status)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)

      const response = await fetch(`/api/n8n/webhooks?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status_code >= 200 && l.status_code < 300).length,
    errors: logs.filter(l => l.status_code >= 400).length,
    avg_time: logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.execution_time_ms, 0) / logs.length)
      : 0,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Webhook Logs</h1>
        <p className="text-gray-600">
          Monitor all incoming webhook calls and their responses
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Calls</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">Successful</div>
          <div className="text-2xl font-bold text-green-600">{stats.success}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-sm text-gray-600 mb-1">Errors</div>
          <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">Avg Response Time</div>
          <div className="text-2xl font-bold text-blue-600">{stats.avg_time}ms</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.method}
            onChange={(e) => setFilters({ ...filters, method: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="2xx">Success (2xx)</option>
            <option value="4xx">Client Error (4xx)</option>
            <option value="5xx">Server Error (5xx)</option>
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="From Date"
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="To Date"
          />
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading webhook logs...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">📨</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Webhook Logs</h3>
          <p className="text-gray-600">No webhook calls have been received yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Webhook URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                        log.method === 'POST' ? 'bg-green-100 text-green-800' :
                        log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.webhook_url}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge statusCode={log.status_code} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.execution_time_ms}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Webhook Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Info */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Request Info</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    <div><span className="font-medium">Method:</span> {selectedLog.method}</div>
                    <div><span className="font-medium">URL:</span> {selectedLog.webhook_url}</div>
                    <div><span className="font-medium">Status:</span> <StatusBadge statusCode={selectedLog.status_code} /></div>
                    <div><span className="font-medium">Response Time:</span> {selectedLog.execution_time_ms}ms</div>
                    <div><span className="font-medium">Timestamp:</span> {new Date(selectedLog.created_at).toLocaleString()}</div>
                  </div>
                </div>

                {/* Request Body */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Request Body</h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.request_body, null, 2)}
                  </pre>
                </div>

                {/* Response Body */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Response Body</h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.response_body, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ statusCode }: { statusCode: number }) {
  let color = 'gray'
  if (statusCode >= 200 && statusCode < 300) color = 'green'
  else if (statusCode >= 300 && statusCode < 400) color = 'blue'
  else if (statusCode >= 400 && statusCode < 500) color = 'yellow'
  else if (statusCode >= 500) color = 'red'

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium bg-${color}-100 text-${color}-800`}>
      {statusCode}
    </span>
  )
}
