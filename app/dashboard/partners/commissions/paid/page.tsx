'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Commission {
  id: number
  buyer_code: string
  buyer_name: string
  tracking_id: string
  offer_name: string
  commission_type: string
  commission_amount: number
  currency: string
  payment_date: string
  approved_by: string
  approved_at: string
  period_month: number | null
  period_year: number | null
  created_at: string
}

export default function PaidCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterBuyer, setFilterBuyer] = useState('')

  useEffect(() => {
    fetchPaid()
  }, [])

  const fetchPaid = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/partners/commissions?status=paid')
      if (response.ok) {
        const data = await response.json()
        setCommissions(data.commissions || [])
      }
    } catch (error) {
      console.error('Failed to fetch paid commissions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique buyers
  const uniqueBuyers = Array.from(
    new Set(commissions.map(c => `${c.buyer_code}|${c.buyer_name}`))
  ).map(str => {
    const [code, name] = str.split('|')
    return { buyer_code: code, buyer_name: name }
  })

  // Get unique years
  const uniqueYears = Array.from(
    new Set(commissions.map(c => new Date(c.payment_date).getFullYear()))
  ).sort((a, b) => b - a)

  const filteredCommissions = commissions.filter(c => {
    const paymentDate = new Date(c.payment_date)
    
    if (filterMonth && paymentDate.getMonth() + 1 !== parseInt(filterMonth)) return false
    if (filterYear && paymentDate.getFullYear() !== parseInt(filterYear)) return false
    if (filterBuyer && c.buyer_code !== filterBuyer) return false
    
    return true
  })

  const totalPaid = filteredCommissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0)

  // Group by month
  const groupedByMonth: { [key: string]: Commission[] } = {}
  filteredCommissions.forEach(comm => {
    const date = new Date(comm.payment_date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!groupedByMonth[key]) {
      groupedByMonth[key] = []
    }
    groupedByMonth[key].push(comm)
  })

  const sortedMonths = Object.keys(groupedByMonth).sort().reverse()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/partners/commissions"
          className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
        >
          ← Komisyon Takibine Dön
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Ödeme Geçmişi</h1>
        <p className="text-gray-600 mt-1">
          Ödenen tüm komisyonları görüntüle
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow">
          <p className="text-blue-800 text-sm mb-2">Toplam Ödeme</p>
          <p className="text-3xl font-bold text-blue-900">{filteredCommissions.length}</p>
        </div>
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg shadow">
          <p className="text-green-800 text-sm mb-2">Ödenen Toplam</p>
          <p className="text-3xl font-bold text-green-900">€{totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg shadow">
          <p className="text-purple-800 text-sm mb-2">Ortalama Ödeme</p>
          <p className="text-3xl font-bold text-purple-900">
            €{filteredCommissions.length > 0 ? (totalPaid / filteredCommissions.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner</label>
            <select
              value={filterBuyer}
              onChange={(e) => setFilterBuyer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              {uniqueBuyers.map(b => (
                <option key={b.buyer_code} value={b.buyer_code}>
                  {b.buyer_name} ({b.buyer_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              {uniqueYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ay</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              <option value="1">Ocak</option>
              <option value="2">Şubat</option>
              <option value="3">Mart</option>
              <option value="4">Nisan</option>
              <option value="5">Mayıs</option>
              <option value="6">Haziran</option>
              <option value="7">Temmuz</option>
              <option value="8">Ağustos</option>
              <option value="9">Eylül</option>
              <option value="10">Ekim</option>
              <option value="11">Kasım</option>
              <option value="12">Aralık</option>
            </select>
          </div>
        </div>
      </div>

      {/* Paid List - Grouped by Month */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
      ) : filteredCommissions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">💸</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ödeme Bulunamadı
          </h3>
          <p className="text-gray-600">
            Filtre kriterlerinize uygun ödeme bulunamadı.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map(monthKey => {
            const [year, month] = monthKey.split('-')
            const monthCommissions = groupedByMonth[monthKey]
            const monthTotal = monthCommissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0)
            const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

            return (
              <div key={monthKey} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {monthNames[parseInt(month)]} {year}
                  </h3>
                  <div className="text-right">
                    <p className="text-sm opacity-90">{monthCommissions.length} ödeme</p>
                    <p className="text-xl font-bold">€{monthTotal.toFixed(2)}</p>
                  </div>
                </div>

                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tracking ID</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Partner</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Ürün</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Tutar</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Ödeme Tarihi</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Onaylayan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthCommissions.map((comm) => (
                      <tr key={comm.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-mono text-gray-900">{comm.tracking_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{comm.buyer_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{comm.buyer_code}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{comm.offer_name}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-green-600">
                            {comm.currency}{(Number(comm.commission_amount) || 0).toFixed(2)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {new Date(comm.payment_date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {comm.approved_by}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
