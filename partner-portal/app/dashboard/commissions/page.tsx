'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'

interface Commission {
  id: number
  tracking_id: string
  offer_id: string
  offer_name: string
  commission_amount: number
  commission_currency: string
  commission_type: string
  status: string
  created_at: string
  approved_at: string | null
  paid_at: string | null
}

interface Stats {
  total_commissions: number
  pending_count: number
  approved_count: number
  paid_count: number
  pending_amount: number
  approved_amount: number
  paid_amount: number
  total_amount: number
  commission_currency: string
}

export default function CommissionsPage() {
  const t = useTranslation()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchCommissions()
  }, [statusFilter])

  const fetchCommissions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('partner_token')
      const url = `/api/commissions?status=${statusFilter}&limit=50`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setCommissions(data.commissions)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching commissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t.commissions.title}
        </h1>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm mb-1">
              {t.commissions.summary.totalEarned}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.commission_currency}{(Number(stats.total_amount) || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-2">
              {stats.total_commissions} {t.commissions.total}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm mb-1">
              {t.commissions.summary.pendingAmount}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.commission_currency}{(Number(stats.pending_amount) || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-2">
              {stats.pending_count} {t.commissions.pending}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm mb-1">
              {t.commissions.approved}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.commission_currency}{(Number(stats.approved_amount) || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-2">
              {stats.approved_count} {t.commissions.approved}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm mb-1">
              {t.commissions.paid}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.commission_currency}{(Number(stats.paid_amount) || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-2">
              {stats.paid_count} {t.commissions.paid}
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {['all', 'pending', 'approved', 'paid'].map((status) => {
            let label = status
            if (status === 'all') label = t.commissions.total
            else if (status === 'pending') label = t.commissions.pending
            else if (status === 'approved') label = t.commissions.approved
            else if (status === 'paid') label = t.commissions.paid
            
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-6 py-3 font-medium transition-colors ${
                  statusFilter === status
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-500 dark:text-gray-400">{t.common.loading}</p>
          </div>
        ) : commissions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">{t.commissions.noCommissions}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase">
                    {t.leads.trackingId}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase">
                    {t.leads.offer}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase">
                    {t.commissions.type}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase">
                    {t.commissions.amount}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase">
                    {t.commissions.status}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 dark:text-gray-400 uppercase">
                    {t.commissions.date}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {commissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {commission.tracking_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {commission.offer_name || commission.offer_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">
                        {commission.commission_type === 'lead' ? t.commissions.types.lead :
                         commission.commission_type === 'sale' ? t.commissions.types.sale :
                         commission.commission_type === 'recurring' ? t.commissions.types.recurring :
                         commission.commission_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {commission.commission_currency}{(Number(commission.commission_amount) || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(commission.status)}`}>
                        {commission.status === 'pending' ? t.commissions.pending :
                         commission.status === 'approved' ? t.commissions.approved :
                         commission.status === 'paid' ? t.commissions.paid :
                         commission.status === 'rejected' ? t.commissions.rejected :
                         commission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
