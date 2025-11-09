import { Suspense } from 'react'
import { sql } from '@vercel/postgres'

interface N8nError {
  id: number
  error_type: string | null
  error_code: string | null
  error_message: string | null
  workflow_name: string | null
  execution_id: string | null
  node_name: string | null
  tracking_id: string | null
  status: string
  created_at: string
  resolved_at: string | null
  resolution_notes: string | null
}

async function getErrors(): Promise<N8nError[]> {
  try {
    const { rows } = await sql`
      SELECT 
        id,
        error_type,
        error_code,
        error_message,
        workflow_name,
        execution_id,
        node_name,
        tracking_id,
        status,
        created_at,
        resolved_at,
        resolution_notes
      FROM n8n_errors
      ORDER BY created_at DESC
      LIMIT 100
    `
    return rows as N8nError[]
  } catch (error) {
    console.error('Error fetching n8n errors:', error)
    return []
  }
}

async function getErrorStats() {
  try {
    const { rows } = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_errors,
        COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'ignored' THEN 1 END) as ignored
      FROM n8n_errors
      WHERE created_at > NOW() - INTERVAL '7 days'
    `
    return rows[0]
  } catch (error) {
    console.error('Error fetching error stats:', error)
    return {
      total: 0,
      new_errors: 0,
      investigating: 0,
      resolved: 0,
      ignored: 0
    }
  }
}

function getStatusBadge(status: string) {
  const badges: { [key: string]: string } = {
    new: 'bg-red-100 text-red-700',
    investigating: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    ignored: 'bg-gray-100 text-gray-600',
  }
  
  return badges[status] || 'bg-gray-100 text-gray-700'
}

function getStatusLabel(status: string) {
  const labels: { [key: string]: string } = {
    new: 'Yeni',
    investigating: 'İnceleniyor',
    resolved: 'Çözüldü',
    ignored: 'Göz Ardı Edildi',
  }
  
  return labels[status] || status
}

function getErrorTypeIcon(errorType: string | null) {
  if (!errorType) return '❓'
  
  const icons: { [key: string]: string } = {
    workflow_failed: '⚠️',
    api_error: '🔌',
    timeout: '⏱️',
    validation_error: '✏️',
    connection_error: '📡',
    database_error: '🗄️',
  }
  
  return icons[errorType] || '❌'
}

async function ErrorsContent() {
  const [errors, stats] = await Promise.all([
    getErrors(),
    getErrorStats()
  ])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Toplam Hata (7 gün)</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <div className="text-sm text-red-600 mb-1">Yeni</div>
          <div className="text-2xl font-bold text-red-700">{stats.new_errors}</div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-yellow-600 mb-1">İnceleniyor</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.investigating}</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <div className="text-sm text-green-600 mb-1">Çözüldü</div>
          <div className="text-2xl font-bold text-green-700">{stats.resolved}</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg shadow border border-gray-300">
          <div className="text-sm text-gray-600 mb-1">Göz Ardı</div>
          <div className="text-2xl font-bold text-gray-700">{stats.ignored}</div>
        </div>
      </div>

      {/* Errors Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">n8n Hata Logları</h2>
          <p className="text-sm text-gray-600 mt-1">
            Son 100 hata gösteriliyor - 
            <a 
              href="https://n8n.dtektracking.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 ml-2"
            >
              n8n Panel'e Git ↗
            </a>
          </p>
        </div>

        {errors.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Harika! Hata yok</h3>
            <p className="text-gray-600">n8n workflow'ları sorunsuz çalışıyor</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hata Tipi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow / Node
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hata Mesajı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {errors.map((error) => (
                  <tr key={error.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getErrorTypeIcon(error.error_type)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {error.error_type || 'Unknown'}
                          </div>
                          {error.error_code && (
                            <div className="text-xs text-gray-500 font-mono">
                              {error.error_code}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {error.workflow_name || '-'}
                      </div>
                      {error.node_name && (
                        <div className="text-xs text-gray-500">
                          Node: {error.node_name}
                        </div>
                      )}
                      {error.execution_id && (
                        <div className="text-xs text-gray-400 font-mono mt-1">
                          {error.execution_id.substring(0, 12)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        {error.error_message ? (
                          error.error_message.length > 150 
                            ? error.error_message.substring(0, 150) + '...'
                            : error.error_message
                        ) : '-'}
                      </div>
                      {error.resolution_notes && (
                        <div className="text-xs text-green-600 mt-2 italic">
                          ✓ Çözüm: {error.resolution_notes.substring(0, 100)}
                          {error.resolution_notes.length > 100 && '...'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {error.tracking_id ? (
                        <div className="text-sm font-mono text-gray-900">
                          {error.tracking_id}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(error.status)}`}>
                        {getStatusLabel(error.status)}
                      </span>
                      {error.resolved_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(error.resolved_at).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(error.created_at).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(error.created_at).toLocaleTimeString('tr-TR')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              n8n Hatalarını Nasıl Çözerim?
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>1. <strong>n8n Panel'e git</strong> ve ilgili workflow'u aç</li>
              <li>2. <strong>Execution ID</strong> ile hatayı bul (Executions sekmesi)</li>
              <li>3. Hatalı node'u incele ve düzelt</li>
              <li>4. Test et ve workflow'u yeniden aktif et</li>
              <li>5. Hata tekrar ederse <strong>Developer'a bildir</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AffiliateErrorsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">⚠️ Hatalı Bağlantılar</h1>
          <p className="text-gray-600 mt-2">
            n8n workflow'larında oluşan hataları görüntüleyin ve yönetin
          </p>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-gray-600">Hatalar yükleniyor...</div>
            </div>
          </div>
        }>
          <ErrorsContent />
        </Suspense>
      </div>
    </div>
  )
}
