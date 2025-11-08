'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  mobile_clean_port?: number;
  mobile_gray_port?: number;
  mobile_aggr_port?: number;
  file_path?: string;
  nginx_config_path?: string;
  pm2_processes?: any;
  deployed_at: string;
  updated_at: string;
}

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params?.id as string;

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [pm2Status, setPm2Status] = useState<any>(null);
  const [sslInfo, setSslInfo] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    domain: '',
    pm2_name: '',
    clean_port: '',
    requestSSL: false,
    sslEmail: ''
  });

  useEffect(() => {
    if (siteId) {
      fetchSiteDetails();
    }
  }, [siteId]);

  const fetchSiteDetails = async () => {
    try {
      // Get site info
      const siteRes = await fetch(`/api/sites/${siteId}`);
      const siteData = await siteRes.json();
      
      if (siteData.success) {
        setSite(siteData.data);

        // Get PM2 status
        if (siteData.data.site_type !== 'static') {
          fetchPM2Status();
        }

        // Get SSL info
        if (siteData.data.ssl_enabled) {
          fetchSSLInfo();
        }
      } else {
        alert('Site not found');
        router.push('/dashboard/sites');
      }
    } catch (error) {
      console.error('Error fetching site:', error);
      alert('Failed to load site details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPM2Status = async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/pm2`);
      const data = await res.json();
      if (data.success) {
        setPm2Status(data.data);
      }
    } catch (error) {
      console.error('Error fetching PM2 status:', error);
    }
  };

  const fetchSSLInfo = async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/ssl`);
      const data = await res.json();
      if (data.success) {
        setSslInfo(data.data);
      }
    } catch (error) {
      console.error('Error fetching SSL info:', error);
    }
  };

  const handlePM2Action = async (action: 'start' | 'stop' | 'restart') => {
    if (!confirm(`Are you sure you want to ${action} all processes for this site?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sites/${siteId}/pm2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`Processes ${action}ed successfully!`);
        fetchPM2Status();
        fetchSiteDetails();
      } else {
        alert(`Failed to ${action} processes: ${data.message}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing processes:`, error);
      alert(`Failed to ${action} processes`);
    }
  };

  // Delete functionality removed - use Site Management page instead

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      stopped: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      deploying: 'bg-yellow-100 text-yellow-800',
    };
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
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

  if (loading) {
    return (
              <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
        </div>
    );
  }

  if (!site) {
    return (
              <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Site Not Found</h2>
          <Link href="/dashboard/sites" className="text-indigo-600 hover:underline">
            Back to Sites
          </Link>
        </div>
    );
  }

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/sites"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getSiteTypeIcon(site.site_type)}</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
                <a
                  href={`https://${site.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {site.domain} ↗
                </a>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {getStatusBadge(site.status)}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-center transition-colors"
            >
              🌐 Visit Site
            </a>

            {site.site_type !== 'static' && (
              <>
                <button
                  onClick={() => handlePM2Action('restart')}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Restart
                </button>
                <button
                  onClick={() => handlePM2Action('stop')}
                  className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  ⏸️ Stop
                </button>
              </>
            )}

            <button
              onClick={() => {
                setEditForm({
                  domain: site.domain || '',
                  pm2_name: site.name || '',
                  clean_port: site.clean_port?.toString() || '',
                  requestSSL: false,
                  sslEmail: ''
                });
                setShowEditModal(true);
              }}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              ✏️ Düzenle
            </button>
            
            <button
              onClick={() => router.push('/dashboard/sites/manage')}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              🗂️ Site Yönetimi
            </button>
          </div>
        </div>

        {/* Site Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">General Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Site Type</p>
                <p className="text-lg font-medium text-gray-900">{site.site_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Domain</p>
                <p className="text-lg font-medium text-gray-900">{site.domain}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-medium text-gray-900">{site.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Deployed At</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(site.deployed_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(site.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* SSL Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">SSL Certificate</h2>
            {site.ssl_enabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-2xl">🔒</span>
                  <span className="font-semibold">SSL Enabled</span>
                </div>
                {site.ssl_expires_at && (
                  <div>
                    <p className="text-sm text-gray-600">Expires At</p>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(site.ssl_expires_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <Link
                  href="/dashboard/sites/ssl"
                  className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                >
                  Manage SSL
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">SSL not enabled for this site</p>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                  Enable SSL
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ports Configuration */}
        {site.site_type !== 'static' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Port Configuration</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {site.clean_port && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Clean Version</p>
                  <p className="text-2xl font-bold text-green-700">{site.clean_port}</p>
                </div>
              )}
              {site.gray_port && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Gray Version</p>
                  <p className="text-2xl font-bold text-gray-700">{site.gray_port}</p>
                </div>
              )}
              {site.aggr_port && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Aggressive Version</p>
                  <p className="text-2xl font-bold text-red-700">{site.aggr_port}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PM2 Processes */}
        {site.site_type !== 'static' && pm2Status && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">PM2 Processes</h2>
              <Link
                href="/dashboard/sites/processes"
                className="text-indigo-600 hover:underline text-sm"
              >
                View All Processes →
              </Link>
            </div>
            {pm2Status.processes && pm2Status.processes.length > 0 ? (
              <div className="space-y-3">
                {pm2Status.processes.map((proc: any) => (
                  <div key={proc.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{proc.name}</p>
                      <p className="text-sm text-gray-600">
                        Status: <span className={`font-medium ${proc.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                          {proc.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>CPU: {proc.cpu}%</p>
                      <p>Memory: {(proc.memory / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">No processes running</p>
            )}
          </div>
        )}

        {/* File Path */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">File System</h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Site Files Path</p>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded">{site.file_path || 'Not set'}</p>
            </div>
            {site.nginx_config_path && (
              <div>
                <p className="text-sm text-gray-600">NGINX Config Path</p>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">{site.nginx_config_path}</p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Site Düzenle</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={editForm.domain}
                  onChange={(e) => setEditForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PM2 Process İsmi
                </label>
                <input
                  type="text"
                  value={editForm.pm2_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, pm2_name: e.target.value }))}
                  placeholder="my-site-name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port
                </label>
                <input
                  type="number"
                  value={editForm.clean_port}
                  onChange={(e) => setEditForm(prev => ({ ...prev, clean_port: e.target.value }))}
                  placeholder="3000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={editForm.requestSSL}
                    onChange={(e) => setEditForm(prev => ({ ...prev, requestSSL: e.target.checked }))}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    SSL Sertifikası Ekle (Let's Encrypt)
                  </span>
                </label>

                {editForm.requestSSL && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SSL Email
                    </label>
                    <input
                      type="email"
                      value={editForm.sslEmail}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sslEmail: e.target.value }))}
                      placeholder="admin@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/sites/${siteId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          domain: editForm.domain,
                          name: editForm.pm2_name,
                          clean_port: editForm.clean_port ? parseInt(editForm.clean_port) : undefined,
                          requestSSL: editForm.requestSSL,
                          sslEmail: editForm.sslEmail
                        })
                      });
                      
                      const data = await res.json();
                      if (data.success) {
                        alert('Site başarıyla güncellendi!');
                        setShowEditModal(false);
                        fetchSiteDetails(); // Reload site data
                      } else {
                        alert(`Hata: ${data.error}`);
                      }
                    } catch (error) {
                      alert('Güncelleme sırasında hata oluştu');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
