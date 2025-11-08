'use client';

import { useState, useEffect } from 'react';

interface SSLCertificate {
  id: string;
  domain: string;
  site_id: string;
  status: string;
  issued_at?: string;
  expires_at?: string;
  auto_renew: boolean;
  cert_path?: string;
  key_path?: string;
  fullchain_path?: string;
  site_name?: string;
}

export default function SSLCertificatesPage() {
  const [certificates, setCertificates] = useState<SSLCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      // Get active sites from database to get real domains
      const sitesRes = await fetch('/api/sites');
      const sitesData = await sitesRes.json();
      
      // Get SSL certificates directly from certbot
      const sslRes = await fetch('/api/ssl/scan');
      const sslData = await sslRes.json();
      
      if (sslData.success && sitesData.success) {
        // Get all unique domains from active sites
        const activeDomains = new Set<string>();
        sitesData.data.forEach((site: any) => {
          if (site.domain) {
            // Add base domain
            activeDomains.add(site.domain.toLowerCase());
            // Also add without www if it has www
            if (site.domain.startsWith('www.')) {
              activeDomains.add(site.domain.substring(4).toLowerCase());
            }
            // Also add with www if it doesn't have www
            if (!site.domain.startsWith('www.')) {
              activeDomains.add(`www.${site.domain}`.toLowerCase());
            }
          }
        });
        
        // Also add our main domains and infrastructure subdomains regardless of database
        activeDomains.add('dtektracking.com');
        activeDomains.add('www.dtektracking.com');
        activeDomains.add('garantor360.com');
        activeDomains.add('www.garantor360.com');
        activeDomains.add('monitor.dtektracking.com');
        activeDomains.add('postgres.dtektracking.com');
        activeDomains.add('redis.dtektracking.com');
        activeDomains.add('dosya.dtektracking.com');
        activeDomains.add('n8n.dtektracking.com');
        activeDomains.add('newsalesozphyzenid2.shop');
        activeDomains.add('www.newsalesozphyzenid2.shop');
        
        const allCerts = sslData.certificates
          .filter((cert: any) => {
            // Check if cert domain or any of its domains match active sites
            const certDomain = cert.domain.toLowerCase();
            const certDomains = cert.domains?.map((d: string) => d.toLowerCase()) || [certDomain];
            
            return certDomains.some((d: string) => activeDomains.has(d));
          })
          .map((cert: any) => ({
            id: cert.domain,
            domain: cert.domain,
            site_id: cert.domain,
            status: cert.status,
            issued_at: null,
            expires_at: cert.expires_at,
            auto_renew: true,
            site_name: cert.domain,
            days_remaining: cert.days_remaining,
            cert_path: cert.cert_path,
            key_path: cert.key_path
          }));
        
        setCertificates(allCerts);
      } else {
        setCertificates([]);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (cert: SSLCertificate): number | null => {
    // Use days_remaining from API if available
    if ('days_remaining' in cert && cert.days_remaining !== undefined) {
      return (cert as any).days_remaining;
    }
    
    // Fallback: calculate from expires_at
    if (!cert.expires_at) return null;
    const now = new Date();
    const expiry = new Date(cert.expires_at);
    const diff = expiry.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string, daysRemaining: number | null) => {
    if (daysRemaining !== null) {
      if (daysRemaining < 0) {
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Süresi Doldu</span>;
      } else if (daysRemaining < 30) {
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Yakında Dolacak</span>;
      }
    }
    
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const handleRenewCertificate = async (siteId: string, domain: string) => {
    if (!confirm(`${domain} için SSL sertifikasını yenilemek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sites/${siteId}/ssl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'renew',
          email: 'admin@garantor360.com' // You might want to make this configurable
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Sertifika başarıyla yenilendi!');
        fetchCertificates();
      } else {
        alert(`Sertifika yenilenemedi: ${data.message}`);
      }
    } catch (error) {
      console.error('Error renewing certificate:', error);
      alert('Sertifika yenilenemedi. Lütfen tekrar deneyin.');
    }
  };

  const handleTestSSL = async (siteId: string, domain: string) => {
    try {
      const res = await fetch(`/api/sites/${siteId}/ssl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`SSL Test Sonucu: ${data.message}\nNot: ${data.grade || 'N/A'}`);
      } else {
        alert(`SSL Testi Başarısız: ${data.message}`);
      }
    } catch (error) {
      console.error('Error testing SSL:', error);
      alert('SSL testi yapılamadı. Lütfen tekrar deneyin.');
    }
  };

  const handleDeleteCertificate = async (domain: string) => {
    const confirmMessage = `⚠️ DİKKAT!\n\n${domain} için SSL sertifikasını silmek istediğinizden emin misiniz?\n\nBu işlem:\n• Certbot sertifikasını tamamen silecek\n• Nginx SSL yapılandırmasını kaldıracak\n• Siteye HTTPS erişimi durduracak\n\nGeri alınamaz!`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for safety
    if (!confirm(`Son kez soruyorum: ${domain} sertifikasını SİLMEK istediğinize EMİN MİSİNİZ?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ssl/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${domain} sertifikası başarıyla silindi!`);
        // Always refresh the list after successful deletion
        fetchCertificates();
      } else {
        alert(`❌ Sertifika silinemedi: ${data.message || 'Bilinmeyen hata'}`);
        // Still refresh the list - certificate might be deleted despite error
        fetchCertificates();
      }
    } catch (error) {
      console.error('Error deleting certificate:', error);
      alert('❌ Sertifika silinemedi. Lütfen tekrar deneyin.');
      // Refresh list even on error - state might have changed
      fetchCertificates();
    }
  };

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SSL Sertifikaları</h1>
            <p className="text-gray-600 mt-1">Yayınlanmış siteleriniz için SSL sertifikalarını yönetin</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchCertificates}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              🔄 Yenile
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Sertifika</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{certificates.length}</p>
              </div>
              <div className="text-3xl">🔒</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktif</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {certificates.filter(c => c.status === 'valid').length}
                </p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Yakında Sona Erecek</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {certificates.filter(c => c.status === 'expiring_soon').length}
                </p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Süresi Dolmuş</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {certificates.filter(c => c.status === 'expired').length}
                </p>
              </div>
              <div className="text-3xl">❌</div>
            </div>
          </div>
        </div>

        {/* Certificates List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">SSL sertifikası bulunamadı</h3>
              <p className="text-gray-600 mb-6">SSL etkin bir site yayınlayın, sertifikalar burada görünecektir</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {certificates.map((cert) => {
                const daysRemaining = getDaysRemaining(cert);
                
                return (
                  <div key={cert.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">🔒</span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{cert.site_name || cert.domain}</h3>
                            <a
                              href={`https://${cert.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:underline"
                            >
                              {cert.domain} ↗
                            </a>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Durum</p>
                            {getStatusBadge(cert.status, daysRemaining)}
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Verilme Tarihi</p>
                            <p className="text-sm text-gray-900">
                              {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Son Kullanma Tarihi</p>
                            <p className="text-sm text-gray-900">
                              {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Kalan Gün</p>
                            <p className={`text-sm font-semibold ${
                              daysRemaining === null ? 'text-gray-500' :
                              daysRemaining < 0 ? 'text-red-600' :
                              daysRemaining < 30 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {daysRemaining === null ? 'N/A' : `${daysRemaining} gün`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Otomatik Yenileme:</span>
                            <span className={`px-2 py-1 rounded ${cert.auto_renew ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {cert.auto_renew ? 'Açık' : 'Kapalı'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleTestSSL(cert.site_id, cert.domain)}
                          className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                          title="Test SSL"
                        >
                          🧪 Test Et
                        </button>
                        <button
                          onClick={() => handleRenewCertificate(cert.site_id, cert.domain)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm transition-colors"
                          title="Renew Certificate"
                        >
                          🔄 Yenile
                        </button>
                        <button
                          onClick={() => handleDeleteCertificate(cert.domain)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors font-medium"
                          title="Sertifikayı Sil"
                        >
                          🗑️ Sil
                        </button>
                      </div>                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">SSL Sertifika Yönetimi</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Sertifikalar 30 günden az süre kaldığında otomatik olarak yenilenir</li>
                <li>• SSL yapılandırmasını doğrulamak ve sertifika geçerliliğini kontrol etmek için "Test Et" butonunu kullanın</li>
                <li>• Süresi dolmadan önce manuel olarak yenilemek için "Yenile" butonunu kullanın</li>
                <li>• Tüm sertifikalar Let's Encrypt tarafından sağlanır (ücretsiz ve güvenilir)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
  );
}
