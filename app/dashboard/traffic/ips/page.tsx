'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface IPData {
  ip?: string;  // Veritabanından gelen alan adı
  ip_address?: string;  // Eski alan adı için de destek
  country?: string;
  country_name?: string;
  city?: string;
  isp?: string;
  risk_score?: number;
  spam_score?: number;
  bot_score?: number;
  list_status?: 'whitelist' | 'graylist' | 'blacklist' | 'unknown';
  status?: 'whitelist' | 'graylist' | 'blacklist' | 'unknown';  // Eski alan adı
  first_seen?: string;
  last_seen?: string;
  visit_count?: number;  // Veritabanından gelen
  total_visits?: number;  // Eski alan adı
  form_submissions?: number;
  blocked_attempts?: number;
  notes?: string;
  admin_notes?: string;
  is_bot?: boolean;
  is_vpn?: boolean;
  is_proxy?: boolean;
  device_type?: string;
  browser?: string;
  os?: string;
  redirect_version?: string;
  manual_decision?: boolean;
  same_form_spam_count?: number;
}

export default function IPManagementPage() {
  const router = useRouter();
  const [ips, setIps] = useState<IPData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('last_seen');
  const [selectedIPs, setSelectedIPs] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showQuickAction, setShowQuickAction] = useState<string | null>(null);

  useEffect(() => {
    fetchIPs();
  }, [currentPage, filterStatus, filterRisk, sortBy]);

  const fetchIPs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        status: filterStatus,
        risk: filterRisk,
        sort: sortBy
      });
      
      const res = await fetch(`/api/traffic/ips?${params}`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        setIps(data.data);
        setTotalPages(data.totalPages || 1);
      } else {
        setIps([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching IPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (ip: string, action: string) => {
    try {
      const res = await fetch(`/api/traffic/ips/${ip}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (res.ok) {
        fetchIPs();
        setShowQuickAction(null);
      }
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIPs.length === 0) return;
    
    try {
      const res = await fetch('/api/traffic/ips/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: selectedIPs, action })
      });
      
      if (res.ok) {
        fetchIPs();
        setSelectedIPs([]);
        setShowBulkActions(false);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'whitelist': return 'bg-green-100 text-green-800 border-green-200';
      case 'graylist': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'blacklist': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const filteredIPs = ips.filter(ip => 
    (ip.ip || ip.ip_address)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ip.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ip.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 text-gray-900">
              <span className="text-2xl">🔍</span>
              IP Yönetim Merkezi
            </h1>
            <p className="text-gray-600 mt-3 text-lg">
              Gelişmiş IP analizi, risk değerlendirmesi ve otomatik eylem yönetimi
            </p>
          </div>
          <div className="flex flex-col items-end space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-600">Toplam IP</span>
              <p className="text-2xl font-bold text-blue-600">{filteredIPs.length}</p>
            </div>
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              ⚡ Toplu İşlem
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search Box */}
          <div className="md:col-span-2">
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400 text-xl">🔎</span>
              <input
                type="text"
                placeholder="IP, ülke veya şehir ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">📋 Tüm Durumlar</option>
            <option value="whitelist">✅ Whitelist</option>
            <option value="graylist">🟡 Graylist</option>
            <option value="blacklist">🚫 Blacklist</option>
            <option value="unknown">❓ Bilinmeyen</option>
          </select>

          {/* Risk Filter */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">⚠️ Tüm Riskler</option>
            <option value="high">🔴 Yüksek Risk (70+)</option>
            <option value="medium">🟡 Orta Risk (40-70)</option>
            <option value="low">🟢 Düşük Risk (0-40)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="last_seen">📅 Son Görülme</option>
            <option value="risk_score">⚠️ Risk Skoru</option>
            <option value="total_visits">📊 Toplam Ziyaret</option>
            <option value="spam_score">📧 Spam Skoru</option>
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && selectedIPs.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-medium">
                {selectedIPs.length} IP seçildi
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('whitelist')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✅ Whitelist'e Ekle
                </button>
                <button
                  onClick={() => handleBulkAction('blacklist')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  🚫 Blacklist'e Ekle
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modern IP Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">IP listesi yükleniyor...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredIPs.map((ipData) => (
            <div
              key={ipData.ip || ipData.ip_address}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIPs.includes(ipData.ip || ipData.ip_address || '')}
                      onChange={(e) => {
                        const ipAddr = ipData.ip || ipData.ip_address || '';
                        if (ipAddr && e.target.checked) {
                          setSelectedIPs([...selectedIPs, ipAddr]);
                        } else {
                          setSelectedIPs(selectedIPs.filter(i => i !== ipAddr));
                        }
                      }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-mono font-bold text-gray-900 text-lg">
                        {ipData.ip || ipData.ip_address}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span>{ipData.country || 'Unknown'}</span>
                        {ipData.city && <span>• {ipData.city}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(ipData.list_status || ipData.status || 'unknown')}`}>
                    {(ipData.list_status || ipData.status || 'unknown').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Risk Scores */}
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Risk Skoru</p>
                  <div className={`inline-flex px-3 py-1 rounded-full font-bold ${getRiskColor(ipData.risk_score || 0)}`}>
                    {ipData.risk_score || 0}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Spam</p>
                  <div className={`inline-flex px-3 py-1 rounded-full font-bold ${getRiskColor(ipData.spam_score || 0)}`}>
                    {ipData.spam_score || 0}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Bot</p>
                  <div className={`inline-flex px-3 py-1 rounded-full font-bold ${getRiskColor(ipData.bot_score || 0)}`}>
                    {ipData.bot_score || 0}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="px-6 py-4 bg-gray-50 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{ipData.visit_count || ipData.total_visits || 0}</p>
                  <p className="text-xs text-gray-500">Ziyaret</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{ipData.form_submissions || 0}</p>
                  <p className="text-xs text-gray-500">Form</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{ipData.blocked_attempts || 0}</p>
                  <p className="text-xs text-gray-500">Engelleme</p>
                </div>
              </div>

              {/* Device & Detection Info */}
              <div className="px-6 py-4 flex items-center justify-between border-t">
                <div className="flex items-center gap-3 text-sm">
                  {ipData.is_bot && <span className="text-red-600">🤖 Bot</span>}
                  {ipData.is_vpn && <span className="text-yellow-600">🔒 VPN</span>}
                  {ipData.is_proxy && <span className="text-orange-600">🔀 Proxy</span>}
                </div>
                <div className="text-xs text-gray-500">
                  {ipData.device_type} • {ipData.browser} • {ipData.os}
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between border-t">
                <div className="text-xs text-gray-500">
                  Son: {ipData.last_seen ? new Date(ipData.last_seen).toLocaleString('tr-TR') : 'Bilinmiyor'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/traffic/ips/${ipData.ip || ipData.ip_address}`)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📊 Detay
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => {
                        const ipAddr = ipData.ip || ipData.ip_address || '';
                        setShowQuickAction(showQuickAction === ipAddr ? null : ipAddr);
                      }}
                      className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      ⚡ İşlem
                    </button>
                    
                    {showQuickAction === (ipData.ip || ipData.ip_address) && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                        <button
                          onClick={() => handleQuickAction((ipData.ip || ipData.ip_address || ''), 'whitelist')}
                          className="w-full px-4 py-2 text-left hover:bg-green-50 text-green-700 text-sm"
                        >
                          ✅ Whitelist'e Ekle
                        </button>
                        <button
                          onClick={() => handleQuickAction((ipData.ip || ipData.ip_address || ''), 'graylist')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700 text-sm"
                        >
                          🟡 Graylist'e Ekle
                        </button>
                        <button
                          onClick={() => handleQuickAction((ipData.ip || ipData.ip_address || ''), 'blacklist')}
                          className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-700 text-sm"
                        >
                          🚫 Blacklist'e Ekle
                        </button>
                        <button
                          onClick={() => handleQuickAction((ipData.ip || ipData.ip_address || ''), 'reset')}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 text-blue-700 text-sm border-t"
                        >
                          🔄 Skorları Sıfırla
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            ← Önceki
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}