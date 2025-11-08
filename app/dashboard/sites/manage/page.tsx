'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Site {
  id: string;
  name: string;
  domain: string;
  clean_port: number;
  status: string;
  ssl_enabled: boolean;
  site_type: string;
  deployed_at: string;
  pm2_name?: string;
  pm2_id?: number;
}

interface DeleteModalState {
  isOpen: boolean;
  site: Site | null;
  options: {
    stopPM2: boolean;
    removeNginx: boolean;
    removeSSL: boolean;
    removeDB: boolean;
    removeFiles: boolean;
  };
  isDeleting: boolean;
  progress: string[];
}

export default function ManageSitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    site: null,
    options: {
      stopPM2: true,
      removeNginx: true,
      removeSSL: true,
      removeDB: true,
      removeFiles: false, // Varsayılan olarak kapalı (veri kaybı riski)
    },
    isDeleting: false,
    progress: [],
  });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        setSites(data.data);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (site: Site) => {
    // Protect the panel from being deleted
    if (site.domain === 'garantor360.com' || site.name === 'traffic-control') {
      alert('⚠️ UYARI: Bu panel sisteminin kendisidir!\n\nBu site\'i silemezsiniz çünkü şu anda kullandığınız yönetim panelidir.\n\nSilerseniz panele erişemeyeceksiniz!');
      return;
    }

    setDeleteModal({
      isOpen: true,
      site,
      options: {
        stopPM2: true,
        removeNginx: true,
        removeSSL: site.ssl_enabled,
        removeDB: true,
        removeFiles: false,
      },
      isDeleting: false,
      progress: [],
    });
  };

  const closeDeleteModal = () => {
    if (!deleteModal.isDeleting) {
      setDeleteModal({
        isOpen: false,
        site: null,
        options: {
          stopPM2: true,
          removeNginx: true,
          removeSSL: true,
          removeDB: true,
          removeFiles: false,
        },
        isDeleting: false,
        progress: [],
      });
    }
  };

  const updateOption = (key: keyof typeof deleteModal.options) => {
    setDeleteModal(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [key]: !prev.options[key],
      },
    }));
  };

  const addProgress = (message: string) => {
    setDeleteModal(prev => ({
      ...prev,
      progress: [...prev.progress, message],
    }));
  };

  const deleteSite = async () => {
    if (!deleteModal.site) return;

    setDeleteModal(prev => ({ ...prev, isDeleting: true, progress: [] }));

    try {
      addProgress('🔄 Site silme işlemi başlatılıyor...');

      const response = await fetch(`/api/sites/${deleteModal.site.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: deleteModal.options,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data: any = null;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Response is HTML (error page), likely 502
        const text = await response.text();
        addProgress(`⚠️ Sunucu yanıt veremiyor (${response.status})`);
        addProgress('🔄 Panel yeniden başlatılıyor olabilir...');
        addProgress('⏱️ 10 saniye içinde sayfa yenilenecek...');
        
        // Wait longer for server to recover
        setTimeout(() => {
          closeDeleteModal();
          window.location.reload();
        }, 10000);
        
        return;
      }

      if (!response.ok) {
        addProgress(`❌ HTTP Hata: ${response.status} ${response.statusText}`);
        if (data?.error) {
          addProgress(`❌ ${data.error}`);
        }
        setTimeout(() => {
          setDeleteModal(prev => ({ ...prev, isDeleting: false }));
        }, 3000);
        return;
      }

      if (data.success) {
        addProgress('✅ Site başarıyla silindi!');
        
        // Progress mesajlarını göster
        if (data.steps) {
          data.steps.forEach((step: string) => addProgress(step));
        }

        // 2 saniye bekle sonra sayfayı yenile
        setTimeout(() => {
          closeDeleteModal();
          fetchSites();
        }, 2000);
      } else {
        addProgress(`❌ Hata: ${data.error || 'Bilinmeyen hata'}`);
        setTimeout(() => {
          setDeleteModal(prev => ({ ...prev, isDeleting: false }));
        }, 2000);
      }
    } catch (error) {
      addProgress(`❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      addProgress('💡 Panel kendini yeniden başlatıyor olabilir...');
      addProgress('⏱️ 10 saniye içinde sayfa yenilenecek...');
      
      // Auto-reload after error
      setTimeout(() => {
        window.location.reload();
      }, 10000);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string; icon: string }> = {
      active: { color: 'bg-green-100 text-green-800', text: 'Aktif', icon: '🟢' },
      stopped: { color: 'bg-gray-100 text-gray-800', text: 'Durduruldu', icon: '⚫' },
      error: { color: 'bg-red-100 text-red-800', text: 'Hata', icon: '🔴' },
      deploying: { color: 'bg-yellow-100 text-yellow-800', text: 'Yükleniyor', icon: '🟡' },
    };

    const config = statusMap[status] || statusMap.active;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color} inline-flex items-center gap-1`}>
        <span>{config.icon}</span>
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Yönetimi</h1>
          <p className="text-gray-600 mt-1">Sitelerinizi görüntüleyin, düzenleyin veya silin</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/sites/deploy')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <span>➕</span>
          Yeni Site Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Toplam Site</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sites.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Aktif</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {sites.filter(s => s.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">SSL Etkin</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {sites.filter(s => s.ssl_enabled).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Durdurulmuş</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">
            {sites.filter(s => s.status === 'stopped').length}
          </p>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz site yok</h3>
            <p className="text-gray-600 mb-6">İlk sitenizi ekleyin</p>
            <button
              onClick={() => router.push('/dashboard/sites/deploy')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              ➕ Yeni Site Ekle
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sites.map((site) => (
              <div key={site.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🌐</span>
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

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Durum</p>
                        {getStatusBadge(site.status)}
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Port</p>
                        <p className="text-sm font-mono text-gray-900">{site.clean_port}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">SSL</p>
                        <p className="text-sm text-gray-900">
                          {site.ssl_enabled ? '✅ Aktif' : '❌ Pasif'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tip</p>
                        <p className="text-sm text-gray-900 capitalize">{site.site_type}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Yayın Tarihi</p>
                        <p className="text-sm text-gray-900">
                          {new Date(site.deployed_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/dashboard/sites/${site.id}`)}
                      className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                      title="Detaylar"
                    >
                      📊 Detay
                    </button>
                    <button
                      onClick={() => openDeleteModal(site)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
                      title="Sil"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.site && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">⚠️</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Site Silinecek</h2>
                  <p className="text-gray-600">Bu işlem geri alınamaz!</p>
                </div>
              </div>

              {/* Site Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Silinecek Site:</p>
                <p className="text-xl font-bold text-gray-900">{deleteModal.site.domain}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <span className="text-gray-600">Port:</span>
                    <span className="ml-2 font-mono text-gray-900">{deleteModal.site.clean_port}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">SSL:</span>
                    <span className="ml-2 text-gray-900">{deleteModal.site.ssl_enabled ? 'Aktif' : 'Pasif'}</span>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                <p className="font-semibold text-gray-900 mb-3">Yapılacak İşlemler:</p>

                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteModal.options.stopPM2}
                    onChange={() => updateOption('stopPM2')}
                    disabled={deleteModal.isDeleting}
                    className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">PM2 Process'i Durdur</p>
                    <p className="text-sm text-gray-600">Site çalışmayı durduracak</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteModal.options.removeNginx}
                    onChange={() => updateOption('removeNginx')}
                    disabled={deleteModal.isDeleting}
                    className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Nginx Konfigürasyonunu Sil</p>
                    <p className="text-sm text-gray-600">Domain yönlendirmesi kaldırılacak</p>
                  </div>
                </label>

                {deleteModal.site.ssl_enabled && (
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteModal.options.removeSSL}
                      onChange={() => updateOption('removeSSL')}
                      disabled={deleteModal.isDeleting}
                      className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">SSL Sertifikasını Kaldır</p>
                      <p className="text-sm text-gray-600">Let's Encrypt sertifikası silinecek</p>
                    </div>
                  </label>
                )}

                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteModal.options.removeDB}
                    onChange={() => updateOption('removeDB')}
                    disabled={deleteModal.isDeleting}
                    className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Veritabanı Kaydını Sil</p>
                    <p className="text-sm text-gray-600">Site kaydı veritabanından silinecek</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteModal.options.removeFiles}
                    onChange={() => updateOption('removeFiles')}
                    disabled={deleteModal.isDeleting}
                    className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                  <div>
                    <p className="font-medium text-red-900">Site Dosyalarını Sil</p>
                    <p className="text-sm text-red-700">⚠️ Dikkat: Tüm dosyalar kalıcı olarak silinecek!</p>
                  </div>
                </label>
              </div>

              {/* Progress */}
              {deleteModal.progress.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                  <p className="font-semibold text-gray-900 mb-2">İşlem Durumu:</p>
                  <div className="space-y-1">
                    {deleteModal.progress.map((msg, idx) => (
                      <p key={idx} className="text-sm text-gray-700 font-mono">
                        {msg}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleteModal.isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  ❌ İptal
                </button>
                <button
                  onClick={deleteSite}
                  disabled={deleteModal.isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {deleteModal.isDeleting ? '⏳ Siliniyor...' : '✅ Eminim, Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
