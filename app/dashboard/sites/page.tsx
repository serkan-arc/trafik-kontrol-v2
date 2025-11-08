'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Site {
  id: string;
  name: string;
  domain: string;
  status: string;
  site_type: string;
  ssl_enabled: boolean;
  ssl_expires_at?: string;
  clean_port?: number;
  gray_port?: number;
  aggr_port?: number;
  deployed_at: string;
  updated_at: string;
}

export default function SitesDashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'stopped' | 'error'>('all');

  useEffect(() => {
    fetchSites();
  }, [filter]);

  const syncSites = async () => {
    setSyncing(true);
    setSyncMessage(null);
    
    try {
      const res = await fetch('/api/sites/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          removeOrphans: true,
          cleanDeleted: true,
          autoFixSSL: false
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSyncMessage('✅ Sync completed successfully');
        // Refresh sites list after sync
        await fetchSites();
        
        // Show summary
        const { syncReport } = data;
        if (syncReport) {
          const summary = `PM2: ${syncReport.pm2.synced} synced, SSL: ${syncReport.ssl.synced} synced, DB: ${syncReport.database.updated} updated`;
          setSyncMessage(`✅ ${summary}`);
        }
      } else {
        setSyncMessage(`❌ Sync failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage('❌ Sync failed: Network error');
    } finally {
      setSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const fetchSites = async () => {
    try {
      const url = filter === 'all' 
        ? '/api/sites'
        : `/api/sites?status=${filter}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        setSites(data.data);
      } else {
        setSites([]);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      stopped: 'bg-gray-100 text-gray-800 dark:text-gray-200',
      error: 'bg-red-100 text-red-800',
      deploying: 'bg-yellow-100 text-yellow-800',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 dark:text-gray-200'}`}>
        {status}
      </span>
    );
  };

  const getSiteTypeIcon = (type: string) => {
    const icons = {
      static: '📄',
      nextjs: '▲',
      nodejs: '🟢',
      react: '⚛️',
    };
    return icons[type as keyof typeof icons] || '📦';
  };

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sites Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage deployed websites and applications</p>
            {syncMessage && (
              <div className={`mt-2 px-3 py-1 rounded-lg text-sm inline-flex items-center gap-2 ${
                syncMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {syncMessage}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={syncSites}
              disabled={syncing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Sync</span>
                </>
              )}
            </button>
            <Link
              href="/dashboard/sites/deploy"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <span>🚀</span>
              <span>Deploy New Site</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sites</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{sites.length}</p>
              </div>
              <div className="text-3xl">🌐</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sites</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {sites.filter(s => s.status === 'active').length}
                </p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">SSL Enabled</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {sites.filter(s => s.ssl_enabled).length}
                </p>
              </div>
              <div className="text-3xl">🔒</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {sites.filter(s => s.status === 'error').length}
                </p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex gap-2">
            {['all', 'active', 'stopped', 'error'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Sites List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌐</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sites found</h3>
              <p className="text-gray-600 mb-6">Deploy your first site to get started</p>
              <Link
                href="/dashboard/sites/deploy"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <span>🚀</span>
                <span>Deploy New Site</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sites.map((site) => (
                <div key={site.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getSiteTypeIcon(site.site_type)}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                          {site.domain ? (
                            <a
                              href={`${site.ssl_enabled ? 'https' : 'http'}://${site.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:underline inline-flex items-center gap-1"
                            >
                              {site.domain} ↗
                            </a>
                          ) : (
                            <a
                              href={`http://207.180.204.60:${site.clean_port}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:underline inline-flex items-center gap-1"
                            >
                              http://207.180.204.60:{site.clean_port} ↗
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">Status:</span>
                          {getStatusBadge(site.status)}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">Type:</span>
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{site.site_type}</span>
                        </div>

                        {site.ssl_enabled && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <span>🔒</span>
                            <span>SSL Active</span>
                          </div>
                        )}

                        {site.clean_port && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">Port:</span>
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {site.clean_port}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4 text-xs text-gray-500">
                        <span>Deployed: {new Date(site.deployed_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Updated: {new Date(site.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/sites/${site.id}`}
                        className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
