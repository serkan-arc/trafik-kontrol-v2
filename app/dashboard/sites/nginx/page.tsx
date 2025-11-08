'use client';

import { useState, useEffect } from 'react';

interface SyncSource {
  name: string;
  domain?: string;
  port?: number;
  status?: string;
  source: 'pm2' | 'nginx' | 'database';
  details?: {
    isStatic?: boolean;
    siteType?: 'static' | 'dynamic';
    rootPath?: string;
    [key: string]: any;
  };
}

interface SyncReport {
  sources: {
    pm2: SyncSource[];
    nginx: SyncSource[];
    database: SyncSource[];
  };
  crossReference: {
    allSynced: SyncSource[];
    partialSync: SyncSource[];
    orphans: {
      pm2Only: SyncSource[];
      nginxOnly: SyncSource[];
      databaseOnly: SyncSource[];
    };
  };
}

export default function NginxManagementPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'synced' | 'orphans'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sites/sync-master');
      const data = await res.json();
      
      if (data.success) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (source: SyncSource) => {
    const typeName = {
      pm2: 'PM2 process',
      nginx: 'Nginx config',
      database: 'Database kayıt'
    }[source.source];

    if (!confirm(`${source.name} (${typeName}) silinecek. Emin misiniz?`)) {
      return;
    }

    setDeleting(source.name);
    try {
      const res = await fetch('/api/sites/sync-master/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: source.name,
          type: source.source
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`✅ ${source.name} başarıyla silindi!`);
        fetchData();
      } else {
        alert(`❌ Silinemedi: ${data.message}`);
      }
    } catch (error) {
      alert('❌ Silme işlemi başarısız!');
    } finally {
      setDeleting(null);
    }
  };

  const getSiteTypeBadge = (source: SyncSource) => {
    if (source.source !== 'nginx' || !source.details?.siteType) {
      return <span className="text-gray-400 text-xs">-</span>;
    }

    const isStatic = source.details.siteType === 'static';
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        isStatic ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'
      }`}>
        {isStatic ? '📄 Static' : '⚡ Dynamic'}
      </span>
    );
  };

  const getSystemStatus = (name: string) => {
    if (!report) return { pm2: false, nginx: false, db: false };
    
    const hasPM2 = report.sources.pm2.some(s => s.name === name);
    const hasNginx = report.sources.nginx.some(s => s.name === name);
    const hasDB = report.sources.database.some(s => s.name === name);
    
    return { pm2: hasPM2, nginx: hasNginx, db: hasDB };
  };

  const StatusIcon = ({ active }: { active: boolean }) => (
    <span className={`text-lg ${active ? 'text-green-500' : 'text-gray-300'}`}>
      {active ? '✓' : '○'}
    </span>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!report) {
    return <div className="text-center p-8">Veri yüklenemedi</div>;
  }

  // Prepare data for display
  const allOrphans = [
    ...report.crossReference.orphans.pm2Only,
    ...report.crossReference.orphans.nginxOnly,
    ...report.crossReference.orphans.databaseOnly
  ];

  // Create unified site list
  const allSiteNames = new Set<string>();
  [...report.sources.pm2, ...report.sources.nginx, ...report.sources.database].forEach(s => {
    allSiteNames.add(s.name);
  });

  const allSites = Array.from(allSiteNames).map(name => {
    const pm2Site = report.sources.pm2.find(s => s.name === name);
    const nginxSite = report.sources.nginx.find(s => s.name === name);
    const dbSite = report.sources.database.find(s => s.name === name);
    
    const status = getSystemStatus(name);
    const syncCount = [status.pm2, status.nginx, status.db].filter(Boolean).length;
    
    return {
      name,
      domain: nginxSite?.domain || dbSite?.domain || pm2Site?.domain || '-',
      port: nginxSite?.port || dbSite?.port || pm2Site?.port || '-',
      status,
      syncCount,
      siteType: nginxSite?.details?.siteType,
      isStatic: nginxSite?.details?.isStatic,
      source: nginxSite || dbSite || pm2Site
    };
  });

  // Filter based on active tab
  let displaySites = allSites;
  if (activeTab === 'synced') {
    displaySites = allSites.filter(s => s.syncCount === 3);
  } else if (activeTab === 'orphans') {
    displaySites = allSites.filter(s => s.syncCount < 3);
  }

  const syncedCount = allSites.filter(s => s.syncCount === 3).length;
  const orphanCount = allSites.filter(s => s.syncCount < 3).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistem Senkronizasyonu</h1>
          <p className="text-sm text-gray-600 mt-1">PM2, Nginx ve Database kayıtlarının eşleşme durumu</p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
        >
          🔄 Yenile
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm text-gray-600">Eşleşmiş</p>
              <p className="text-xl font-bold text-green-600">{syncedCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm text-gray-600">Eşleşmeyen</p>
              <p className="text-xl font-bold text-orange-600">{orphanCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-sm text-gray-600">Toplam</p>
              <p className="text-xl font-bold text-gray-900">{allSites.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'all'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tümü ({allSites.length})
          </button>
          <button
            onClick={() => setActiveTab('synced')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'synced'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Eşleşmiş ({syncedCount})
          </button>
          <button
            onClick={() => setActiveTab('orphans')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'orphans'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Eşleşmeyen ({orphanCount})
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İsim</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">PM2</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Nginx</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">DB</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displaySites.map((site, idx) => (
                <tr key={`${site.name}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {site.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {site.domain}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {site.port}
                  </td>
                  <td className="px-4 py-3">
                    {site.isStatic ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        📄 Static
                      </span>
                    ) : site.siteType === 'dynamic' ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                        ⚡ Dynamic
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon active={site.status.pm2} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon active={site.status.nginx} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon active={site.status.db} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {site.syncCount === 3 ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✓ Eşleşmiş
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        ⚠️ Eksik ({site.syncCount}/3)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {site.syncCount < 3 && site.source && (
                      <button
                        onClick={() => handleDelete(site.source!)}
                        disabled={deleting === site.name}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting === site.name ? '...' : '🗑️ Sil'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex gap-2">
            <span className="text-blue-600">💡</span>
            <div className="text-sm text-blue-800">
              <strong>Sistem Durumu:</strong>
              <ul className="mt-1 space-y-1">
                <li>• <strong>PM2:</strong> Process manager (sadece dynamic siteler için)</li>
                <li>• <strong>Nginx:</strong> Web server configuration</li>
                <li>• <strong>DB:</strong> Database kayıtları</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <div className="text-sm text-green-800">
              <strong>Site Tipleri:</strong>
              <ul className="mt-1 space-y-1">
                <li>• <strong>📄 Static:</strong> HTML dosyaları, PM2 gerektirmez</li>
                <li>• <strong>⚡ Dynamic:</strong> Node.js uygulamaları, PM2 gerektirir</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
