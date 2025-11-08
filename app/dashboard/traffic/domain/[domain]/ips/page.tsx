'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface IPAddress {
  id: string
  ip_address: string
  country?: string
  city?: string
  list_type: 'whitelist' | 'blacklist' | 'graylist' | 'unknown'
  risk_score: number
  first_seen: string
  last_seen: string
  total_visits: number
  is_bot: boolean
  bot_type?: string
}

export default function DomainIPManagement({ params }: { params: Promise<{ domain: string }> }) {
  const resolvedParams = use(params)
  const domain = resolvedParams.domain
  
  const [ips, setIps] = useState<IPAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIP, setSelectedIP] = useState<IPAddress | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newIP, setNewIP] = useState('')
  const [newListType, setNewListType] = useState<string>('graylist')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchIPs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/traffic/domains/${domain}/ips?filter=${filter}&search=${searchQuery}`)
      const data = await response.json()
      
      if (data.success) {
        setIps(data.ips)
      }
    } catch (error) {
      console.error('Error fetching IPs:', error)
      setError('IP adresleri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIPs()
  }, [domain, filter, searchQuery])

  const handleAddIP = async () => {
    if (!newIP) {
      setError('Lütfen bir IP adresi girin')
      return
    }

    try {
      const response = await fetch(`/api/traffic/domains/${domain}/ips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ip_address: newIP, 
          list_type: newListType 
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`${newIP} başarıyla eklendi`)
        setNewIP('')
        setShowAddModal(false)
        fetchIPs()
      } else {
        setError(data.error || 'IP eklenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error adding IP:', error)
      setError('IP eklenirken hata oluştu')
    }
  }

  const handleUpdateIP = async (ip: string, listType: string) => {
    try {
      const response = await fetch(`/api/traffic/domains/${domain}/ips/${ip}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_type: listType })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`${ip} güncellendi`)
        fetchIPs()
      } else {
        setError(data.error || 'IP güncellenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error updating IP:', error)
      setError('IP güncellenirken hata oluştu')
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50'
    if (score >= 60) return 'text-orange-600 bg-orange-50'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50'
    if (score >= 20) return 'text-blue-600 bg-blue-50'
    return 'text-green-600 bg-green-50'
  }

  const getListColor = (type: string) => {
    switch(type) {
      case 'whitelist': return 'bg-green-100 text-green-800'
      case 'blacklist': return 'bg-red-100 text-red-800'
      case 'graylist': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredIPs = ips

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link 
                href="/dashboard/traffic/master" 
                className="text-gray-500 hover:text-gray-700"
              >
                Master Panel
              </Link>
              <span className="text-gray-400">/</span>
              <Link 
                href={`/dashboard/traffic/domain/${domain}`}
                className="text-gray-500 hover:text-gray-700"
              >
                {domain}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-semibold">IP Yönetimi</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              🌐 IP Adresi Yönetimi
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {domain} için IP adresi listesi ve kontrolü
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + IP Ekle
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex gap-2">
            {['all', 'whitelist', 'graylist', 'blacklist', 'unknown'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filter === filterType
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterType === 'all' ? 'Tümü' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex-1">
            <input
              type="text"
              placeholder="IP ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* IP List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Adresi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liste
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Skoru
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Konum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İlk Görülme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ziyaret
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bot
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredIPs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    IP adresi bulunamadı
                  </td>
                </tr>
              ) : (
                filteredIPs.map((ip) => (
                  <tr key={ip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-gray-900">
                        {ip.ip_address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={ip.list_type}
                        onChange={(e) => handleUpdateIP(ip.ip_address, e.target.value)}
                        className={`px-2 py-1 text-xs rounded-full border-0 ${getListColor(ip.list_type)}`}
                      >
                        <option value="whitelist">Whitelist</option>
                        <option value="graylist">Graylist</option>
                        <option value="blacklist">Blacklist</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(ip.risk_score)}`}>
                        {ip.risk_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ip.country && ip.city ? `${ip.city}, ${ip.country}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ip.first_seen).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ip.total_visits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ip.is_bot && (
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                          {ip.bot_type || 'Bot'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/traffic/domain/${domain}/ips/${ip.ip_address}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add IP Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">IP Adresi Ekle</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Adresi
                </label>
                <input
                  type="text"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Liste Tipi
                </label>
                <select
                  value={newListType}
                  onChange={(e) => setNewListType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="whitelist">Whitelist (Güvenli)</option>
                  <option value="graylist">Graylist (İzleniyor)</option>
                  <option value="blacklist">Blacklist (Engellendi)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewIP('')
                  setError('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={handleAddIP}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                IP Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
          {success}
        </div>
      )}
    </div>
  )
}