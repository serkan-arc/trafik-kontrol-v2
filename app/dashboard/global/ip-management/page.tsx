'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface IPReputation {
  ip: string
  reputation_score: number
  list_type: 'whitelist' | 'graylist' | 'blacklist' | 'unknown'
  country: string
  city: string
  isp: string
  organization: string
  is_vpn: boolean
  is_proxy: boolean
  is_tor: boolean
  is_datacenter: boolean
  total_requests: number
  suspicious_requests: number
  blocked_requests: number
  spam_attempts: number
  failed_challenges: number
  domains_visited: string[]
  first_seen_at: string
  last_seen_at: string
  is_banned: boolean
  ban_type: string | null
  ban_expires_at: string | null
  ban_reason: string | null
}

interface Statistics {
  whitelist_count: number
  blacklist_count: number
  graylist_count: number
  banned_count: number
  high_risk_count: number
  avg_reputation_score: number
}

export default function IPManagementPage() {
  const [ips, setIps] = useState<IPReputation[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [listType, setListType] = useState<string>('')
  const [isBanned, setIsBanned] = useState<string>('')
  const [searchIP, setSearchIP] = useState<string>('')
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Ban modal
  const [showBanModal, setShowBanModal] = useState(false)
  const [selectedIP, setSelectedIP] = useState<string>('')
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('temporary')
  const [banDuration, setBanDuration] = useState<number>(24)
  const [banReason, setBanReason] = useState<string>('')

  useEffect(() => {
    fetchIPs()
  }, [page, listType, isBanned, searchIP])

  const fetchIPs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (listType) params.append('list_type', listType)
      if (isBanned) params.append('is_banned', isBanned)
      if (searchIP) params.append('search', searchIP)

      const response = await fetch(`/api/global/ip-management/list?${params}`)
      const data = await response.json()

      if (data.success) {
        setIps(data.data.ips)
        setStatistics(data.data.statistics)
        setTotalPages(data.data.pagination.total_pages)
        setTotal(data.data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching IPs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async () => {
    try {
      const response = await fetch('/api/global/ip-management/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: selectedIP,
          ban_type: banType,
          duration_hours: banType === 'temporary' ? banDuration : undefined,
          reason: banReason,
          banned_by: 'admin'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`IP ${selectedIP} banned successfully`)
        setShowBanModal(false)
        fetchIPs()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error banning IP:', error)
      alert('Failed to ban IP')
    }
  }

  const handleUnban = async (ip: string) => {
    if (!confirm(`Unban IP ${ip}?`)) return

    try {
      const response = await fetch(`/api/global/ip-management/ban?ip=${ip}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`IP ${ip} unbanned successfully`)
        fetchIPs()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error unbanning IP:', error)
      alert('Failed to unban IP')
    }
  }

  const handleUpdateListType = async (ip: string, newListType: string) => {
    try {
      const response = await fetch('/api/global/ip-management/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, list_type: newListType })
      })

      const data = await response.json()
      
      if (data.success) {
        fetchIPs()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating IP:', error)
    }
  }

  const getReputationColor = (score: number) => {
    if (score < 30) return 'text-green-600 bg-green-50'
    if (score < 50) return 'text-blue-600 bg-blue-50'
    if (score < 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getReputationLabel = (score: number) => {
    if (score < 30) return 'Trusted'
    if (score < 50) return 'Normal'
    if (score < 70) return 'Suspicious'
    return 'High Risk'
  }

  const getListTypeBadge = (listType: string) => {
    const colors = {
      whitelist: 'bg-green-100 text-green-700',
      graylist: 'bg-gray-100 text-gray-700',
      blacklist: 'bg-red-100 text-red-700',
      unknown: 'bg-gray-50 text-gray-500'
    }
    return colors[listType as keyof typeof colors] || colors.unknown
  }

  if (loading && ips.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🔍 Global IP Management
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Centralized IP reputation and ban management across all domains
        </p>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Total IPs</p>
            <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Whitelist</p>
            <p className="text-2xl font-bold text-green-600">{statistics.whitelist_count}</p>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Blacklist</p>
            <p className="text-2xl font-bold text-red-600">{statistics.blacklist_count}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Graylist</p>
            <p className="text-2xl font-bold text-gray-600">{statistics.graylist_count}</p>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs text-gray-600 mb-1">Banned</p>
            <p className="text-2xl font-bold text-red-600">{statistics.banned_count}</p>
          </div>

          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <p className="text-xs text-gray-600 mb-1">High Risk</p>
            <p className="text-2xl font-bold text-yellow-600">{statistics.high_risk_count}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search IP</label>
            <input
              type="text"
              value={searchIP}
              onChange={(e) => {
                setSearchIP(e.target.value)
                setPage(1)
              }}
              placeholder="192.168.1.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">List Type</label>
            <select
              value={listType}
              onChange={(e) => {
                setListType(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All</option>
              <option value="whitelist">Whitelist</option>
              <option value="graylist">Graylist</option>
              <option value="blacklist">Blacklist</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ban Status</label>
            <select
              value={isBanned}
              onChange={(e) => {
                setIsBanned(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All</option>
              <option value="true">Banned</option>
              <option value="false">Not Banned</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchIP('')
                setListType('')
                setIsBanned('')
                setPage(1)
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* IP List Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reputation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">List Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ips.map((ip) => (
                <tr key={ip.ip} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/global/ip-management/details?ip=${ip.ip}`}
                      className="font-mono text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {ip.ip}
                    </Link>
                    <div className="flex items-center gap-1 mt-1">
                      {ip.is_vpn && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">VPN</span>}
                      {ip.is_proxy && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Proxy</span>}
                      {ip.is_tor && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Tor</span>}
                      {ip.is_datacenter && <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">DC</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getReputationColor(ip.reputation_score)}`}>
                      {ip.reputation_score} - {getReputationLabel(ip.reputation_score)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={ip.list_type}
                      onChange={(e) => handleUpdateListType(ip.ip, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 ${getListTypeBadge(ip.list_type)}`}
                    >
                      <option value="whitelist">Whitelist</option>
                      <option value="graylist">Graylist</option>
                      <option value="blacklist">Blacklist</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{ip.country || '-'}</div>
                    <div className="text-xs text-gray-500">{ip.city || '-'}</div>
                    {ip.isp && <div className="text-xs text-gray-400 truncate max-w-[150px]">{ip.isp}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{ip.total_requests.toLocaleString()} req</div>
                    {ip.suspicious_requests > 0 && (
                      <div className="text-xs text-red-600">{ip.suspicious_requests} suspicious</div>
                    )}
                    <div className="text-xs text-gray-500">{ip.domains_visited?.length || 0} domains</div>
                  </td>
                  <td className="px-6 py-4">
                    {ip.is_banned ? (
                      <div>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Banned
                        </span>
                        {ip.ban_type === 'temporary' && ip.ban_expires_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Expires: {new Date(ip.ban_expires_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      href={`/dashboard/global/ip-management/details?ip=${ip.ip}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Details
                    </Link>
                    {ip.is_banned ? (
                      <button
                        onClick={() => handleUnban(ip.ip)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedIP(ip.ip)
                          setShowBanModal(true)
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {page} of {totalPages} ({total} total IPs)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ban IP Address</h2>
            <p className="text-sm text-gray-600 mb-4">IP: <span className="font-mono font-bold">{selectedIP}</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ban Type</label>
                <select
                  value={banType}
                  onChange={(e) => setBanType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="temporary">Temporary</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

              {banType === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    value={banDuration}
                    onChange={(e) => setBanDuration(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Enter reason for ban..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBanModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Ban IP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
