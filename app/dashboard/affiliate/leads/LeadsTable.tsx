'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Lead {
  id: number
  tracking_id: string
  source: string | null
  affiliate_code: string | null
  campaign_id: string | null
  site_domain: string | null
  buyer_code: string | null
  offer_id: string | null
  offer_name: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
  customer_country: string | null
  lead_data: any
  status: string
  created_at: string
}

interface LeadsTableProps {
  leads: Lead[]
}

function getStatusBadge(status: string) {
  const badges: { [key: string]: string } = {
    pending: 'bg-gray-100 text-gray-700',
    approved_for_crm: 'bg-emerald-100 text-emerald-700',
    in_package: 'bg-blue-100 text-blue-700',
    sent_to_crm: 'bg-indigo-100 text-indigo-700',
    on_hold: 'bg-orange-100 text-orange-700',
    rejected: 'bg-red-100 text-red-700',
  }
  
  return badges[status] || 'bg-gray-100 text-gray-700'
}

function getStatusLabel(status: string) {
  const labels: { [key: string]: string } = {
    pending: 'Bekliyor',
    approved_for_crm: 'Onaylı',
    in_package: 'Paketlendi',
    sent_to_crm: 'Gönderildi',
    on_hold: 'Beklemede',
    rejected: 'Reddedildi',
  }
  
  return labels[status] || status
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter()
  const [selectedLeads, setSelectedLeads] = useState<number[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterAffiliate, setFilterAffiliate] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterSite, setFilterSite] = useState<string>('all')
  const [filterCampaign, setFilterCampaign] = useState<string>('all')
  const [filterBuyer, setFilterBuyer] = useState<string>('all')
  const [filterOffer, setFilterOffer] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  const [detailModalLead, setDetailModalLead] = useState<Lead | null>(null)

  // Get unique values for filters
  const affiliates = useMemo(() => {
    const unique = new Set(leads.map(l => l.affiliate_code).filter((v): v is string => Boolean(v)))
    return Array.from(unique).sort()
  }, [leads])

  const sources = useMemo(() => {
    const unique = new Set(leads.map(l => l.source).filter((v): v is string => Boolean(v)))
    return Array.from(unique).sort()
  }, [leads])

  const sites = useMemo(() => {
    const unique = new Set(leads.map(l => l.site_domain).filter((v): v is string => Boolean(v)))
    return Array.from(unique).sort()
  }, [leads])

  const campaigns = useMemo(() => {
    const unique = new Set(leads.map(l => l.campaign_id).filter((v): v is string => Boolean(v)))
    return Array.from(unique).sort()
  }, [leads])

  const buyers = useMemo(() => {
    const unique = new Set(leads.map(l => l.buyer_code).filter((v): v is string => Boolean(v)))
    return Array.from(unique).sort()
  }, [leads])

  const offers = useMemo(() => {
    const unique = new Set(leads.map(l => l.offer_name).filter((v): v is string => Boolean(v)))
    return Array.from(unique).sort()
  }, [leads])

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (filterStatus !== 'all' && lead.status !== filterStatus) return false
      if (filterAffiliate !== 'all' && lead.affiliate_code !== filterAffiliate) return false
      if (filterSource !== 'all' && lead.source !== filterSource) return false
      if (filterSite !== 'all' && lead.site_domain !== filterSite) return false
      if (filterCampaign !== 'all' && lead.campaign_id !== filterCampaign) return false
      if (filterBuyer !== 'all' && lead.buyer_code !== filterBuyer) return false
      if (filterOffer !== 'all' && lead.offer_name !== filterOffer) return false
      
      if (filterDate !== 'all') {
        const leadDate = new Date(lead.created_at)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        switch (filterDate) {
          case 'today':
            const todayEnd = new Date(today)
            todayEnd.setHours(23, 59, 59, 999)
            if (leadDate < today || leadDate > todayEnd) return false
            break
          case 'yesterday':
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayEnd = new Date(yesterday)
            yesterdayEnd.setHours(23, 59, 59, 999)
            if (leadDate < yesterday || leadDate > yesterdayEnd) return false
            break
          case 'week':
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            if (leadDate < weekAgo) return false
            break
          case 'month':
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            if (leadDate < monthAgo) return false
            break
        }
      }
      
      return true
    })
  }, [leads, filterStatus, filterAffiliate, filterSource, filterSite, filterCampaign, filterBuyer, filterOffer, filterDate])

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id))
    }
  }

  const handleSelectLead = (id: number) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(lid => lid !== id))
    } else {
      setSelectedLeads([...selectedLeads, id])
    }
  }

  const [showPackageModal, setShowPackageModal] = useState(false)

  const handleBulkAction = async (action: string) => {
    if (selectedLeads.length === 0) {
      alert('Lütfen en az bir lead seçin')
      return
    }

    // Package action opens modal instead of direct API call
    if (action === 'package') {
      // Check if all selected leads are approved_for_crm
      const selectedLeadObjects = filteredLeads.filter(l => selectedLeads.includes(l.id))
      const notApproved = selectedLeadObjects.filter(l => l.status !== 'approved_for_crm')
      
      if (notApproved.length > 0) {
        alert(`Sadece "Onaylı" durumundaki leadler paketlenebilir. ${notApproved.length} lead uygun değil.`)
        return
      }
      
      setShowPackageModal(true)
      return
    }

    const confirmMessages: { [key: string]: string } = {
      approve: `${selectedLeads.length} lead'i CRM için onaylamak istediğinize emin misiniz?`,
      hold: `${selectedLeads.length} lead'i bekletmek istediğinize emin misiniz?`,
      reject: `${selectedLeads.length} lead'i reddetmek istediğinize emin misiniz?`
    }

    if (!confirm(confirmMessages[action])) return

    setIsProcessing(true)

    try {
      const response = await fetch('/api/affiliate/leads/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          leadIds: selectedLeads
        })
      })

      if (response.ok) {
        alert('İşlem başarılı! Sayfa yenileniyor...')
        setSelectedLeads([])
        window.location.reload()
      } else {
        const error = await response.json()
        alert('Hata: ' + (error.message || 'İşlem başarısız'))
      }
    } catch (error) {
      console.error('Bulk action error:', error)
      alert('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-700">🔍 Filtrele:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Durum</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="pending">Bekliyor</option>
              <option value="approved_for_crm">Onaylı</option>
              <option value="in_package">Paketlendi</option>
              <option value="sent_to_crm">Gönderildi</option>
              <option value="on_hold">Beklemede</option>
              <option value="rejected">Reddedildi</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Site</label>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              {sites.map(site => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Kampanya</label>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              {campaigns.map(camp => (
                <option key={camp} value={camp}>{camp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Affiliate</label>
            <select
              value={filterAffiliate}
              onChange={(e) => setFilterAffiliate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              {affiliates.map(aff => (
                <option key={aff} value={aff}>{aff}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Buyer</label>
            <select
              value={filterBuyer}
              onChange={(e) => setFilterBuyer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              {buyers.map(buyer => (
                <option key={buyer} value={buyer}>{buyer}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Ürün</label>
            <select
              value={filterOffer}
              onChange={(e) => setFilterOffer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              {offers.map(offer => (
                <option key={offer} value={offer}>{offer}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Kaynak</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              {sources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Tarih</label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="today">Bugün</option>
              <option value="yesterday">Dün</option>
              <option value="week">Son 7 Gün</option>
              <option value="month">Son 30 Gün</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {filteredLeads.length} lead gösteriliyor
            {filteredLeads.length !== leads.length && ` (toplam ${leads.length})`}
          </div>
          <button
            onClick={() => {
              setFilterStatus('all')
              setFilterSite('all')
              setFilterCampaign('all')
              setFilterAffiliate('all')
              setFilterBuyer('all')
              setFilterSource('all')
              setFilterDate('all')
              setSelectedLeads([])
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            🔄 Filtreleri Temizle
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                ✓ {selectedLeads.length} lead seçildi
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('approve')}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                ✅ Onayla
              </button>
              <button
                onClick={() => handleBulkAction('hold')}
                disabled={isProcessing}
                className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
              >
                ⏸️ Beklet
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                ❌ Reddet
              </button>
              <button
                onClick={() => handleBulkAction('package')}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                📦 Pakete Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Lead Listesi</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredLeads.length} lead gösteriliyor
            </p>
          </div>
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {selectedLeads.length === filteredLeads.length ? '❌ Seçimi Kaldır' : '✓ Hepsini Seç'}
          </button>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {leads.length === 0 ? 'Henüz lead yok' : 'Filtreye uygun lead bulunamadı'}
            </h3>
            <p className="text-gray-600">
              {leads.length === 0 
                ? "n8n'den gelen lead'ler burada görünecek" 
                : 'Farklı filtre seçeneklerini deneyin'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kampanya
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Affiliate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kaynak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedLeads.includes(lead.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        {lead.tracking_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.customer_name || '-'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lead.customer_phone || '-'}
                      </div>
                      {lead.customer_email && (
                        <div className="text-xs text-gray-400">
                          {lead.customer_email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {lead.site_domain || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-600">
                        {lead.campaign_id || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        {lead.affiliate_code || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-700">
                        {lead.buyer_code || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-700">
                        {lead.offer_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.source || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(lead.created_at).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(lead.created_at).toLocaleTimeString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setDetailModalLead(lead)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        👁️ Detay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* Detail Modal */}
    {detailModalLead && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              📋 Lead Detayı - {detailModalLead.tracking_id}
            </h3>
            <button
              onClick={() => setDetailModalLead(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Campaign Info */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🎯 Kampanya Bilgisi
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Site</div>
                  <div className="text-md font-medium text-gray-900">{detailModalLead.site_domain || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Kampanya</div>
                  <div className="text-md font-medium text-gray-900">{detailModalLead.campaign_id || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Affiliate</div>
                  <div className="text-md font-mono text-gray-900">{detailModalLead.affiliate_code || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Buyer (Kampanya Sahibi)</div>
                  <div className="text-md font-semibold text-blue-700">{detailModalLead.buyer_code || '-'}</div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                👤 Müşteri Bilgisi
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Ad</div>
                  <div className="text-md font-medium text-gray-900">{detailModalLead.customer_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Telefon</div>
                  <div className="text-md font-medium text-gray-900">{detailModalLead.customer_phone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="text-md font-medium text-gray-900">{detailModalLead.customer_email || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Ülke</div>
                  <div className="text-md font-medium text-gray-900">{detailModalLead.customer_country || '-'}</div>
                </div>
                {detailModalLead.customer_address && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600">Adres</div>
                    <div className="text-md text-gray-900">{detailModalLead.customer_address}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Source Info */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🔄 Kaynak Bilgisi
              </h4>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Kaynak</div>
                    <div className="text-md font-medium text-gray-900">{detailModalLead.source || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Durum</div>
                    <div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(detailModalLead.status)}`}>
                        {getStatusLabel(detailModalLead.status)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600">Oluşturulma Tarihi</div>
                    <div className="text-md font-medium text-gray-900">
                      {new Date(detailModalLead.created_at).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full JSON Data */}
            {detailModalLead.lead_data && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  📊 Tam Veri (JSON)
                </h4>
                <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-gray-800">
                    {JSON.stringify(detailModalLead.lead_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
            <button
              onClick={() => {
                // Excel download logic
                alert('Excel indirme özelliği yakında eklenecek')
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              📄 Excel İndir
            </button>
            <button
              onClick={() => {
                // Buyer panel send logic
                alert('Buyer paneline gönderme özelliği yakında eklenecek')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🔗 Buyer Paneline Gönder
            </button>
            <button
              onClick={() => setDetailModalLead(null)}
              className="ml-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Package Creation Modal */}
    {showPackageModal && (
      <PackageModal
        selectedLeads={selectedLeads}
        leads={filteredLeads.filter(l => selectedLeads.includes(l.id))}
        onClose={() => setShowPackageModal(false)}
        onSuccess={() => {
          setShowPackageModal(false)
          setSelectedLeads([])
          router.push('/dashboard/affiliate/packages')
        }}
      />
    )}
    </>
  )
}

// Package Creation Modal Component
function PackageModal({ selectedLeads, leads, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [batchName, setBatchName] = useState('')
  const [buyers, setBuyers] = useState<any[]>([])
  const [offers, setOffers] = useState<any[]>([])

  // Auto-detect buyer and offer if all leads have same values
  const detectedBuyer = useMemo<string>(() => {
    const buyerCodes = [...new Set(leads.map((l: any) => l.buyer_code).filter(Boolean))]
    return (buyerCodes.length === 1 ? buyerCodes[0] : '') as string
  }, [leads])

  const detectedOffer = useMemo<string>(() => {
    const offerIds = [...new Set(leads.map((l: any) => l.offer_id).filter(Boolean))]
    return (offerIds.length === 1 ? offerIds[0] : '') as string
  }, [leads])

  const [selectedBuyer, setSelectedBuyer] = useState<string>(detectedBuyer)
  const [selectedOffer, setSelectedOffer] = useState<string>(detectedOffer)

  useState(() => {
    setSelectedBuyer(detectedBuyer)
    setSelectedOffer(detectedOffer)
  })

  useState(() => {
    // Fetch buyers and offers
    Promise.all([
      fetch('/api/partners?status=active'),
      fetch('/api/offers?status=active')
    ]).then(async ([buyersRes, offersRes]) => {
      if (buyersRes.ok) {
        const data = await buyersRes.json()
        setBuyers(data.partners || [])
      }
      if (offersRes.ok) {
        const data = await offersRes.json()
        setOffers(data.offers || [])
      }
    })
  })

  const handleCreate = async () => {
    if (!batchName.trim()) {
      alert('Paket adı zorunludur')
      return
    }

    if (!selectedBuyer) {
      alert('Partner seçimi zorunludur')
      return
    }

    if (!selectedOffer) {
      alert('Ürün seçimi zorunludur')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_name: batchName,
          buyer_code: selectedBuyer,
          offer_id: selectedOffer,
          lead_ids: leads.map((l: any) => l.tracking_id),
          created_by: 'admin'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(`Paket başarıyla oluşturuldu! ${data.added_count} lead eklendi.`)
        onSuccess()
      } else {
        alert('Hata: ' + (data.error || 'Paket oluşturulamadı'))
      }
    } catch (error) {
      console.error('Package creation error:', error)
      alert('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">📦 Yeni Paket Oluştur</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Lead Count Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 font-medium">
                ✓ {selectedLeads.length} lead seçildi
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Tüm leadler "Onaylı" durumunda olmalıdır
              </p>
            </div>

            {/* Batch Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paket Adı *
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Örn: Kasım 2024 - Feroxil Paketi"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Buyer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partner *
              </label>
              <select
                value={selectedBuyer}
                onChange={(e) => setSelectedBuyer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seçiniz...</option>
                {buyers.map(b => (
                  <option key={b.buyer_code} value={b.buyer_code}>
                    {b.buyer_name} ({b.buyer_code})
                  </option>
                ))}
              </select>
              {detectedBuyer && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Otomatik tespit edildi
                </p>
              )}
            </div>

            {/* Offer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ürün *
              </label>
              <select
                value={selectedOffer}
                onChange={(e) => setSelectedOffer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seçiniz...</option>
                {offers.map(o => (
                  <option key={o.offer_id} value={o.offer_id}>
                    {o.offer_name} ({o.offer_id})
                  </option>
                ))}
              </select>
              {detectedOffer && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Otomatik tespit edildi
                </p>
              )}
            </div>

            {/* Lead Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seçilen Leadler ({leads.length})
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                {leads.map((lead: any) => (
                  <div key={lead.id} className="text-xs text-gray-700 py-1 border-b border-gray-200 last:border-0">
                    <span className="font-mono">{lead.tracking_id}</span>
                    <span className="mx-2">|</span>
                    <span>{lead.customer_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-6 mt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : '📦 Paketi Oluştur'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
