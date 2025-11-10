'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Search, Filter, Download } from 'lucide-react'

interface Lead {
  tracking_id: string
  offer_id: string
  campaign_id: string
  affiliate_code: string
  status: string
  source: string
  created_at: string
  commission_amount: number | null
  commission_currency: string
  commission_status: string
}

interface Stats {
  total_leads: number
  pending: number
  sent_to_crm: number
  contacted: number
  sold: number
  rejected: number
  total_commission: number
}

export default function LeadsPage() {
  const t = useTranslation()
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLeads()
  }, [statusFilter])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('partner_token')
      const url = `/api/leads?status=${statusFilter}&limit=50`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setLeads(data.leads)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      approved_for_crm: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      sent_to_crm: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      contacted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      sold: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-500 dark:text-gray-400'
  }

  const filteredLeads = leads.filter(lead =>
    searchQuery === '' || lead.tracking_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t.leads.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">
          {t.leads.allLeads}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">{t.dashboard.stats.totalLeads}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_leads}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">{t.leads.statuses.pending}</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">{t.leads.statuses.sent_to_crm}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent_to_crm}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">{t.leads.statuses.contacted}</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.contacted}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">{t.leads.statuses.sold}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.sold}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">{t.leads.statuses.rejected}</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">{t.leads.commission}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              €{(Number(stats.total_commission) || 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder={t.leads.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-semibold"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
          >
            <option value="all">{t.leads.filters.all}</option>
            <option value="pending">{t.leads.statuses.pending}</option>
            <option value="approved_for_crm">{t.leads.statuses.approved_for_crm}</option>
            <option value="sent_to_crm">{t.leads.statuses.sent_to_crm}</option>
            <option value="contacted">{t.leads.statuses.contacted}</option>
            <option value="sold">{t.leads.statuses.sold}</option>
            <option value="rejected">{t.leads.statuses.rejected}</option>
          </select>

          {/* Export Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Download className="w-5 h-5" />
            <span>{t.leads.export}</span>
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-500 dark:text-gray-400">{t.common.loading}</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">{t.leads.noLeads}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.leads.trackingId}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.leads.offer}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.leads.status}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.leads.commission}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.leads.date}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeads.map((lead) => (
                  <tr key={lead.tracking_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {lead.tracking_id}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400">
                        {lead.source}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {lead.offer_id || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {t.leads.statuses[lead.status as keyof typeof t.leads.statuses] || lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.commission_amount ? (
                        <div className="text-sm">
                          <div className="font-medium text-green-600 dark:text-green-400">
                            {lead.commission_currency}{(Number(lead.commission_amount) || 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400">
                            {lead.commission_status}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Info */}
      {!loading && filteredLeads.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">
          {t.leads.showing} {filteredLeads.length} {t.leads.of} {stats?.total_leads || 0} {t.leads.results}
        </div>
      )}
    </div>
  )
}
