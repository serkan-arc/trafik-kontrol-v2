import { Suspense } from 'react'
import { sql } from '@vercel/postgres'
import LeadsTable from './LeadsTable'

interface Lead {
  id: number
  tracking_id: string
  source: string | null
  affiliate_code: string | null
  campaign_id: string | null
  site_domain: string | null
  buyer_code: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
  customer_country: string | null
  lead_data: any
  status: string
  created_at: string
}

async function getLeads(): Promise<Lead[]> {
  try {
    const { rows } = await sql`
      SELECT 
        id,
        tracking_id,
        source,
        affiliate_code,
        campaign_id,
        site_domain,
        buyer_code,
        customer_name,
        customer_phone,
        customer_email,
        customer_address,
        customer_country,
        lead_data,
        status,
        created_at
      FROM n8n_leads
      ORDER BY created_at DESC
      LIMIT 500
    `
    return rows as Lead[]
  } catch (error) {
    console.error('Error fetching leads:', error)
    return []
  }
}

async function getStats() {
  try {
    const { rows } = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved_for_crm' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'in_package' THEN 1 END) as in_package,
        COUNT(CASE WHEN status = 'sent_to_crm' THEN 1 END) as sent_to_crm,
        COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM n8n_leads
    `
    return rows[0]
  } catch (error) {
    console.error('Error fetching stats:', error)
    return {
      total: 0,
      pending: 0,
      approved: 0,
      in_package: 0,
      sent_to_crm: 0,
      on_hold: 0,
      rejected: 0
    }
  }
}

async function LeadsContent() {
  const [leads, stats] = await Promise.all([
    getLeads(),
    getStats()
  ])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Toplam Lead</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg shadow border border-gray-300">
          <div className="text-sm text-gray-600 mb-1">Bekliyor</div>
          <div className="text-2xl font-bold text-gray-700">{stats.pending}</div>
        </div>
        
        <div className="bg-emerald-50 p-4 rounded-lg shadow border border-emerald-200">
          <div className="text-sm text-emerald-600 mb-1">Onaylı</div>
          <div className="text-2xl font-bold text-emerald-700">{stats.approved}</div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <div className="text-sm text-blue-600 mb-1">Paketlendi</div>
          <div className="text-2xl font-bold text-blue-700">{stats.in_package}</div>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-lg shadow border border-indigo-200">
          <div className="text-sm text-indigo-600 mb-1">Gönderildi</div>
          <div className="text-2xl font-bold text-indigo-700">{stats.sent_to_crm}</div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg shadow border border-orange-200">
          <div className="text-sm text-orange-600 mb-1">Beklemede</div>
          <div className="text-2xl font-bold text-orange-700">{stats.on_hold}</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <div className="text-sm text-red-600 mb-1">Reddedildi</div>
          <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
        </div>
      </div>

      {/* Interactive Leads Table */}
      <LeadsTable leads={leads} />
    </div>
  )
}

export default function AffiliateleadsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">📊 Lead Havuzu</h1>
          <p className="text-gray-600 mt-2">
            n8n'den gelen tüm lead'leri görüntüleyin ve takip edin
          </p>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-gray-600">Lead'ler yükleniyor...</div>
            </div>
          </div>
        }>
          <LeadsContent />
        </Suspense>
      </div>
    </div>
  )
}
