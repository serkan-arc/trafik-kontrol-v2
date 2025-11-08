'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SyncSource {
  name: string;
  domain?: string;
  port?: number;
  ssl?: boolean;
  status?: string;
  type: 'pm2' | 'nginx' | 'database';
}

interface SyncSite {
  primaryName: string;
  primaryDomain?: string;
  sources: {
    pm2?: SyncSource;
    nginx?: SyncSource;
    database?: SyncSource;
  };
  syncStatus: 'all-synced' | 'partial' | 'orphan';
  issues: string[];
}

interface SyncReport {
  sources: {
    pm2: SyncSource[];
    nginx: SyncSource[];
    database: SyncSource[];
  };
  crossReference: {
    allSynced: SyncSite[];
    partialSync: SyncSite[];
    orphans: {
      pm2Only: SyncSource[];
      nginxOnly: SyncSource[];
      databaseOnly: SyncSource[];
    };
  };
  issues: string[];
  recommendations: string[];
}

interface SyncSummary {
  totalSites: number;
  fullySynced: number;
  partiallySynced: number;
  totalOrphans: number;
  healthScore: number;
}

export default function NginxManagementPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixOptions, setFixOptions] = useState({
    removeOrphanPM2: true,
    removeOrphanNginx: true,
    updateDatabaseStatus: true,
    dryRun: false
  });
  const [fixResult, setFixResult] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'synced' | 'partial' | 'orphans'>('orphans');

  useEffect(() => {
    fetchSyncReport();
  }, []);

  const fetchSyncReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sites/sync-master');
      const data = await res.json();
      
      if (data.success) {
        setReport(data.report);
        setSummary(data.summary);
      } else {
        console.error('Failed to fetch sync report:', data.message);
      }
    } catch (error) {
      console.error('Error fetching sync report:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAutoFix = async () => {
    setSyncing(true);
    setFixResult(null);
    
    try {
      const res = await fetch('/api/sites/sync-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fixOptions)
      });
      
      const data = await res.json();
      
      if (data.success) {
        setFixResult(data);
        setShowFixModal(false);
        
        // Refresh report after fix
        if (!fixOptions.dryRun) {
          await fetchSyncReport();
        }
      } else {
        setFixResult({ success: false, message: data.message });
      }
    } catch (error) {
      console.error('Error running auto-fix:', error);
      setFixResult({ success: false, message: 'Network error' });
    } finally {
      setSyncing(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getSyncStatusBadge = (status: string) => {
    const statusClasses = {
      'all-synced': 'bg-green-100 text-green-800',
      'partial': 'bg-yellow-100 text-yellow-800',
      'orphan': 'bg-red-100 text-red-800',
    };
    
    const statusLabels = {
      'all-synced': '✅ Tam Senkronize',
      'partial': '⚠️ Kısmi Senkronize',
      'orphan': '❌ Eşleşmeyen Kayıt',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  const renderSiteCard = (site: SyncSite) => {
    const allGood = site.sources.pm2 && site.sources.nginx && site.sources.database;
    
    return (
      <div key={site.primaryName} className={`border-2 rounded-xl p-5 transition-all hover:shadow-lg ${
        allGood ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{site.primaryName}</h3>
            {site.primaryDomain && (
              <p className="text-sm text-gray-700 font-mono bg-white px-2 py-1 rounded inline-block">
                🌐 {site.primaryDomain}
              </p>
            )}
          </div>
          <div className="ml-3">
            {getSyncStatusBadge(site.syncStatus)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* PM2 Status */}
          <div className={`p-3 rounded-lg border-2 ${site.sources.pm2 ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
            <div className="text-xs font-bold text-gray-700 mb-1">PM2 Process</div>
            {site.sources.pm2 ? (
              <div className="text-sm">
                <div className="font-bold text-green-700">✅ Çalışıyor</div>
                {site.sources.pm2.status && (
                  <div className="text-xs text-gray-600 mt-1">{site.sources.pm2.status}</div>
                )}
              </div>
            ) : (
              <div className="text-sm font-bold text-red-700">❌ Yok</div>
            )}
          </div>

          {/* Nginx Status */}
          <div className={`p-3 rounded-lg border-2 ${site.sources.nginx ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
            <div className="text-xs font-bold text-gray-700 mb-1">Nginx Config</div>
            {site.sources.nginx ? (
              <div className="text-sm">
                <div className="font-bold text-green-700">✅ Var</div>
                {site.sources.nginx.port && (
                  <div className="text-xs text-gray-600 mt-1">Port: {site.sources.nginx.port}</div>
                )}
              </div>
            ) : (
              <div className="text-sm font-bold text-red-700">❌ Yok</div>
            )}
          </div>

          {/* Database Status */}
          <div className={`p-3 rounded-lg border-2 ${site.sources.database ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
            <div className="text-xs font-bold text-gray-700 mb-1">Database</div>
            {site.sources.database ? (
              <div className="text-sm">
                <div className="font-bold text-green-700">✅ Kayıtlı</div>
              </div>
            ) : (
              <div className="text-sm font-bold text-red-700">❌ Yok</div>
            )}
          </div>
        </div>

        {site.issues.length > 0 && (
          <div className="mt-3 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
            <div className="text-sm font-bold text-red-900 mb-2">⚠️ Sorunlar:</div>
            <ul className="text-sm text-red-800 space-y-1">
              {site.issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderOrphanCard = (source: SyncSource, type: string) => {
    const typeLabels = {
      'pm2': { emoji: '🟡', label: 'Sadece PM2', color: 'yellow' },
      'nginx': { emoji: '🟢', label: 'Sadece Nginx', color: 'green' },
      'database': { emoji: '🟣', label: 'Sadece Database', color: 'purple' }
    };
    
    const typeInfo = typeLabels[type as keyof typeof typeLabels] || { emoji: '⚪', label: type, color: 'gray' };
    
    return (
      <div key={`${type}-${source.name}`} className="border-2 border-red-300 rounded-xl p-5 bg-gradient-to-br from-red-50 to-orange-50 hover:shadow-lg transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{typeInfo.emoji}</span>
              <h4 className="text-xl font-bold text-gray-900">{source.name}</h4>
            </div>
            {source.domain && (
              <p className="text-sm text-gray-700 font-mono bg-white px-2 py-1 rounded inline-block">
                🌐 {source.domain}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t-2 border-red-200">
          <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-red-600 text-white">
            {typeInfo.label}
          </span>
          <div className="text-xs text-gray-600 space-y-1 text-right">
            {source.port && <div className="font-semibold">Port: <span className="text-indigo-600">{source.port}</span></div>}
            {source.status && <div>Durum: <span className="font-semibold">{source.status}</span></div>}
          </div>
        </div>
        
        <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
          <strong>⚠️ Uyarı:</strong> Bu kayıt diğer 2 sistemde bulunamadı. Temizlenmeli veya eksik kısımlar tamamlanmalı.
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (!report || !summary) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Senkronizasyon raporu yüklenemedi</h3>
          <button
            onClick={fetchSyncReport}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const filteredSites = selectedTab === 'all' 
    ? [...report.crossReference.allSynced, ...report.crossReference.partialSync]
    : selectedTab === 'synced'
    ? report.crossReference.allSynced
    : selectedTab === 'partial'
    ? report.crossReference.partialSync
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔄 Nginx & Sistem Senkronizasyonu</h1>
          <p className="text-gray-600 mt-1">PM2, Nginx ve Veritabanı arasında ana senkronizasyon yönetimi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSyncReport}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span>🔄</span>
            <span>Yenile</span>
          </button>
          <button
            onClick={() => setShowFixModal(true)}
            disabled={summary.totalOrphans === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>🔧</span>
            <span>Otomatik Düzelt</span>
          </button>
        </div>
      </div>

      {/* Health Score Card */}
      <div className={`${getHealthBg(summary.healthScore)} border-2 border-gray-300 rounded-lg p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-1">Sistem Sağlık Skoru</h2>
            <div className={`text-4xl font-bold ${getHealthColor(summary.healthScore)}`}>
              {summary.healthScore.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {summary.totalSites} siteden {summary.fullySynced} tanesi tamamen senkronize
            </p>
          </div>
          <div className="text-right">
            <div className="text-6xl mb-2">
              {summary.healthScore >= 90 ? '😃' : summary.healthScore >= 70 ? '😐' : '😟'}
            </div>
            {summary.totalOrphans > 0 && (
              <div className="text-sm text-red-600 font-medium">
                {summary.totalOrphans} eşleşmeyen {summary.totalOrphans > 1 ? 'kayıt' : 'kayıt'} tespit edildi
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Site</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalSites}</p>
            </div>
            <div className="text-3xl">🌐</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tam Senkronize</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{summary.fullySynced}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kısmi Senkronize</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.partiallySynced}</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eşleşmeyen Kayıtlar</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{summary.totalOrphans}</p>
            </div>
            <div className="text-3xl">🚨</div>
          </div>
        </div>
      </div>

      {/* Info Card - What does this mean? */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          <span>Eşleşme Nedir? Neden Önemli?</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white rounded p-3 border border-indigo-100">
            <div className="font-bold text-green-700 mb-2">✅ Tam Senkronize</div>
            <div className="text-gray-700 space-y-1">
              <div>• PM2'de <span className="font-semibold text-green-600">ÇALIŞIYOR</span></div>
              <div>• Nginx'te <span className="font-semibold text-green-600">CONFIG VAR</span></div>
              <div>• Veritabanında <span className="font-semibold text-green-600">KAYITLI</span></div>
              <div className="mt-2 pt-2 border-t text-green-700 font-medium">
                👍 Her şey uyumlu!
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded p-3 border border-yellow-100">
            <div className="font-bold text-yellow-700 mb-2">⚠️ Kısmi Senkronize</div>
            <div className="text-gray-700 space-y-1">
              <div>• PM2'de <span className="font-semibold text-green-600">ÇALIŞIYOR</span></div>
              <div>• Nginx'te <span className="font-semibold text-green-600">CONFIG VAR</span></div>
              <div>• Veritabanında <span className="font-semibold text-red-600">KAYIT YOK ❌</span></div>
              <div className="mt-2 pt-2 border-t text-yellow-700 font-medium">
                ⚠️ Eksik var, tamamlanmalı!
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded p-3 border border-red-100">
            <div className="font-bold text-red-700 mb-2">❌ Eşleşmeyen Kayıt</div>
            <div className="text-gray-700 space-y-1">
              <div>• PM2'de <span className="font-semibold text-green-600">ÇALIŞIYOR</span></div>
              <div>• Nginx'te <span className="font-semibold text-red-600">YOK ❌</span></div>
              <div>• Veritabanında <span className="font-semibold text-red-600">YOK ❌</span></div>
              <div className="mt-2 pt-2 border-t text-red-700 font-medium">
                🗑️ Tek başına, silinmeli!
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-indigo-800 bg-indigo-100 rounded p-2">
          <strong>💡 Özet:</strong> Site çalışmak için 3 yerde de olmalı: PM2'de process çalışmalı + Nginx'te config olmalı + Veritabanında kayıtlı olmalı. 
          Eğer sadece 1 yerde varsa "eşleşmeyen" demektir ve temizlenmelidir.
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Öneriler</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {report.recommendations.map((rec, idx) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tüm Siteler ({report.crossReference.allSynced.length + report.crossReference.partialSync.length})
          </button>
          <button
            onClick={() => setSelectedTab('synced')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === 'synced'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tam Senkronize ({report.crossReference.allSynced.length})
          </button>
          <button
            onClick={() => setSelectedTab('partial')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === 'partial'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Kısmi Senkronize ({report.crossReference.partialSync.length})
          </button>
          <button
            onClick={() => setSelectedTab('orphans')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === 'orphans'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Eşleşmeyen Kayıtlar ({summary.totalOrphans})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {selectedTab === 'orphans' ? (
          <div className="space-y-4">
            {summary.totalOrphans === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Eşleşmeyen kayıt tespit edilmedi</h3>
                <p className="text-gray-600">Tüm siteler düzgün bir şekilde senkronize</p>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                  <h3 className="text-xl font-bold text-red-900 mb-2">
                    ⚠️ {summary.totalOrphans} Eşleşmeyen Kayıt Bulundu
                  </h3>
                  <p className="text-sm text-red-700">
                    Bu kayıtlar sadece 1 sistemde mevcut. Diğer 2 sistemde bulunamadı. 
                    <strong className="ml-1">Temizlenmeli veya eksik kısımlar tamamlanmalı.</strong>
                  </p>
                </div>

                {/* Tüm orphanları tek listede göster */}
                <div className="space-y-3">
                  {[
                    ...report.crossReference.orphans.pm2Only.map(s => ({ ...s, orphanType: 'pm2' })),
                    ...report.crossReference.orphans.nginxOnly.map(s => ({ ...s, orphanType: 'nginx' })),
                    ...report.crossReference.orphans.databaseOnly.map(s => ({ ...s, orphanType: 'database' }))
                  ].map((source, idx) => renderOrphanCard(source, source.orphanType))}
                </div>

                {/* Toplu temizleme butonu */}
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-yellow-900 mb-1">Toplu Temizlik Önerisi</h4>
                      <p className="text-sm text-yellow-800 mb-3">
                        Tüm eşleşmeyen kayıtları otomatik olarak temizlemek için "Otomatik Düzelt" butonunu kullanabilirsiniz.
                      </p>
                      <button
                        onClick={() => setShowFixModal(true)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium text-sm"
                      >
                        🔧 Otomatik Düzelt
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSites.length > 0 ? (
              filteredSites.map(site => renderSiteCard(site))
            ) : (
              <div className="col-span-2 text-center py-12">
                <div className="text-6xl mb-4">🌐</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Bu kategoride site yok</h3>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto-Fix Modal */}
      {showFixModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🔧 Otomatik Düzeltme Ayarları</h3>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={fixOptions.removeOrphanPM2}
                  onChange={(e) => setFixOptions({...fixOptions, removeOrphanPM2: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Eşleşmeyen PM2 süreçlerini kaldır</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={fixOptions.removeOrphanNginx}
                  onChange={(e) => setFixOptions({...fixOptions, removeOrphanNginx: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Eşleşmeyen Nginx yapılandırmalarını kaldır</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={fixOptions.updateDatabaseStatus}
                  onChange={(e) => setFixOptions({...fixOptions, updateDatabaseStatus: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Veritabanı durumunu güncelle</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={fixOptions.dryRun}
                  onChange={(e) => setFixOptions({...fixOptions, dryRun: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 font-medium">Kuru Çalışma (sadece önizleme)</span>
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-xs text-yellow-800">
                ⚠️ Bu işlem sisteminizde değişiklik yapacaktır. Önce Kuru Çalışma ile önizleyin.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFixModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
İptal
              </button>
              <button
                onClick={runAutoFix}
                disabled={syncing}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {syncing ? 'İşleniyor...' : fixOptions.dryRun ? 'Önizle' : 'Düzeltmeleri Uygula'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fix Result Toast */}
      {fixResult && (
        <div className={`fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg ${
          fixResult.success ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">{fixResult.success ? '✅' : '❌'}</div>
            <div className="flex-1">
              <h4 className={`font-semibold ${fixResult.success ? 'text-green-900' : 'text-red-900'}`}>
                {fixResult.success ? 'Otomatik Düzeltme Tamamlandı' : 'Otomatik Düzeltme Başarısız'}
              </h4>
              {fixResult.summary && (
                <div className="text-sm text-gray-700 mt-1">
                  <div>Düzeltilen: {fixResult.summary.fixedCount}</div>
                  <div>Hatalar: {fixResult.summary.errorCount}</div>
                  <div>Sağlık: {fixResult.summary.beforeHealth.toFixed(1)}% → {fixResult.summary.afterHealth.toFixed(1)}%</div>
                </div>
              )}
              {fixResult.message && (
                <p className="text-sm text-gray-700 mt-1">{fixResult.message}</p>
              )}
            </div>
            <button
              onClick={() => setFixResult(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
