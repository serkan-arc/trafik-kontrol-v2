'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LocalFolder {
  name: string;
  path: string;
  type: string;
  size: string;
  modified: string;
  hasPackageJson: boolean;
  packageName: string;
  version: string;
}

export default function DeployNewSitePage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Source Select, 2: Configure, 3: Deploy

  // Source selection state
  const [sourceType, setSourceType] = useState<'local' | 'upload'>('local');
  const [localFolders, setLocalFolders] = useState<LocalFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<LocalFolder | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Configuration state
  const [config, setConfig] = useState({
    name: '',
    domain: '',
    siteType: 'static',
    cleanPort: '',
    grayPort: '',
    aggrPort: '',
    requestSSL: false,
    sslEmail: '',
  });

  // Deployment state
  const [deploying, setDeploying] = useState(false);
  const [deploymentLog, setDeploymentLog] = useState<string[]>([]);
  const [deploymentSuccess, setDeploymentSuccess] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);

  // Load local folders on component mount
  useEffect(() => {
    if (sourceType === 'local') {
      fetchLocalFolders();
    }
  }, [sourceType]);

  const fetchLocalFolders = async () => {
    setLoadingFolders(true);
    try {
      const res = await fetch('/api/sites/local-folders');
      const data = await res.json();
      if (data.success) {
        setLocalFolders(data.folders);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleFolderSelect = (folder: LocalFolder) => {
    setSelectedFolder(folder);
    setConfig(prev => ({
      ...prev,
      name: folder.packageName || folder.name,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('siteName', config.name || file.name.replace('.zip', ''));

    try {
      const res = await fetch('/api/sites/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setUploadResult(data.data);
        setConfig(prev => ({
          ...prev,
          name: prev.name || data.data.siteName,
          siteType: data.data.siteType || 'static',
        }));
        setStep(2);
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfigSubmit = async () => {
    // Validation
    if (!config.name) {
      alert('Lütfen site adı girin');
      return;
    }

    // If domain is empty and site is not static, port is required
    if (!config.domain && config.siteType !== 'static' && !config.cleanPort) {
      alert('Domain olmadan deploy için port numarası gereklidir');
      return;
    }

    if (config.requestSSL && !config.domain) {
      alert('SSL sertifikası için domain gereklidir');
      return;
    }

    if (config.requestSSL && !config.sslEmail) {
      alert('SSL sertifikası için e-posta adresi girin');
      return;
    }

    setDeploying(true);
    setDeploymentLog(['Starting deployment process...']);

    try {
      // Step 1: Create site record
      setDeploymentLog(prev => [...prev, '1. Creating site record...']);
      
      const createRes = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          domain: config.domain,
          file_path: selectedFolder ? selectedFolder.path : (uploadResult?.filePath || ''),
          site_type: config.siteType,
          clean_port: config.cleanPort ? parseInt(config.cleanPort) : null,
          gray_port: config.grayPort ? parseInt(config.grayPort) : null,
          aggr_port: config.aggrPort ? parseInt(config.aggrPort) : null,
          ssl_enabled: config.requestSSL,
        }),
      });

      const createData = await createRes.json();

      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create site');
      }

      const newSiteId = createData.data.id;
      setSiteId(newSiteId);
      setDeploymentLog(prev => [...prev, '✓ Site record created']);

      // Step 2: Deploy site (PM2 + NGINX + SSL)
      setDeploymentLog(prev => [...prev, '2. Deploying site infrastructure...']);

      const deployRes = await fetch(`/api/sites/${newSiteId}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestSSL: config.requestSSL,
          sslEmail: config.sslEmail,
        }),
      });

      const deployData = await deployRes.json();

      if (deployData.deploymentLog) {
        setDeploymentLog(prev => [...prev, ...deployData.deploymentLog]);
      }

      if (deployData.success) {
        setDeploymentLog(prev => [...prev, '✓ Deployment completed successfully!']);
        setDeploymentSuccess(true);
        setStep(3);
      } else {
        throw new Error(deployData.error || 'Deployment failed');
      }

    } catch (error: any) {
      setDeploymentLog(prev => [...prev, `✗ Error: ${error.message}`]);
      setDeploymentSuccess(false);
    } finally {
      setDeploying(false);
    }
  };

  return (
          <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deploy New Site</h1>
          <p className="text-gray-600 mt-1">Upload and configure your website for deployment</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Kaynak Seç', icon: '📁' },
              { num: 2, label: 'Yapılandır', icon: '⚙️' },
              { num: 3, label: 'Deploy', icon: '🚀' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-3 ${step >= s.num ? 'text-indigo-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    step >= s.num ? 'bg-indigo-100' : 'bg-gray-100'
                  }`}>
                    {s.icon}
                  </div>
                  <span className="font-medium">{s.label}</span>
                </div>
                {idx < 2 && (
                  <div className={`w-16 h-1 mx-4 ${step > s.num ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Source Selection */}
        {step === 1 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Adım 1: Kaynak Seçimi</h2>
            <p className="text-gray-600 mb-6">Sunucudaki mevcut klasörü seçin veya ZIP dosyası yükleyin</p>

            {/* Source Type Selector */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSourceType('local')}
                className={`flex-1 py-4 px-6 rounded-lg border-2 transition-all ${
                  sourceType === 'local'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">📁</div>
                <div className="font-semibold">Sunucudaki Klasör</div>
                <div className="text-sm opacity-75 mt-1">Mevcut projeyi kullan</div>
              </button>
              <button
                onClick={() => setSourceType('upload')}
                className={`flex-1 py-4 px-6 rounded-lg border-2 transition-all ${
                  sourceType === 'upload'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">📤</div>
                <div className="font-semibold">ZIP Yükle</div>
                <div className="text-sm opacity-75 mt-1">Yeni dosya yükle</div>
              </button>
            </div>

            {/* Local Folder Selection */}
            {sourceType === 'local' && (
              <div>
                {/* Search Box */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="🔍 Klasör ara... (örn: ozphyzen, landing-pages)"
                      className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <span className="absolute left-3 top-3 text-gray-400 text-xl">🔍</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Tüm alt klasörler de aranır. {localFolders.length} klasör bulundu.
                  </p>
                </div>

                {loadingFolders ? (
                  <div className="text-center py-12">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-gray-600">Klasörler yükleniyor...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {localFolders
                      .filter(folder => 
                        searchQuery === '' || 
                        folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        folder.path.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((folder) => (
                      <div
                        key={folder.path}
                        onClick={() => handleFolderSelect(folder)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedFolder?.path === folder.path
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-2xl">
                              {folder.type === 'nextjs' && '⚛️'}
                              {folder.type === 'react' && '⚛️'}
                              {folder.type === 'nodejs' && '🟢'}
                              {folder.type === 'express' && '🚂'}
                              {folder.type === 'static' && '📄'}
                              {folder.type === 'unknown' && '📁'}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                              <p className="text-xs text-gray-500 mt-1 font-mono break-all">{folder.path}</p>
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span>📦 {folder.type.toUpperCase()}</span>
                                <span>💾 {folder.size}</span>
                                <span>🕒 {new Date(folder.modified).toLocaleDateString('tr-TR')}</span>
                              </div>
                              {folder.packageName && folder.packageName !== folder.name && (
                                <div className="mt-1 text-xs text-indigo-600">
                                  Package: {folder.packageName} v{folder.version}
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedFolder?.path === folder.path && (
                            <div className="text-2xl">✅</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {searchQuery && localFolders.filter(f => 
                      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.path.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-3">🔍</div>
                        <p>"{searchQuery}" için sonuç bulunamadı</p>
                        <p className="text-sm mt-2">Farklı bir arama terimi deneyin</p>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedFolder}
                  className="mt-6 w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Devam Et →
                </button>
              </div>
            )}

            {/* ZIP Upload */}
            {sourceType === 'upload' && (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {file ? file.name : 'Tıklayın veya sürükle-bırak yapın'}
                    </p>
                    <p className="text-sm text-gray-600">Sadece ZIP dosyaları (max 100MB)</p>
                    {file && (
                      <p className="text-sm text-indigo-600 mt-2">
                        Boyut: {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </label>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Adı (opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="my-awesome-site"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="mt-6 w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {uploading ? 'Yükleniyor...' : 'Yükle & Devam Et'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Adım 2: Site Yapılandırması</h2>
            {selectedFolder && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-900">
                  <span className="text-2xl">📁</span>
                  <div>
                    <div className="font-semibold">{selectedFolder.name}</div>
                    <div className="text-sm opacity-75">{selectedFolder.path}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Site Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Site Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Name *
                    </label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="my-site"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domain (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={config.domain}
                      onChange={(e) => setConfig(prev => ({ ...prev, domain: e.target.value }))}
                      placeholder="example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      💡 Boş bırakırsanız site sadece IP:Port ile erişilebilir olacak. Sonradan Site Yönetimi sayfasından domain ekleyebilirsiniz.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Type
                    </label>
                    <select
                      value={config.siteType}
                      onChange={(e) => setConfig(prev => ({ ...prev, siteType: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="static">Static HTML</option>
                      <option value="nextjs">Next.js</option>
                      <option value="nodejs">Node.js</option>
                      <option value="react">React</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Port Configuration */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Port Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {config.siteType === 'static' 
                    ? '📌 Static siteler için sadece bir port gereklidir (npx serve ile çalışır)'
                    : '🎯 Traffic yönetimi için farklı versiyonlar farklı portlarda çalışır'}
                </p>
                <div className={`grid ${config.siteType === 'static' ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {config.siteType === 'static' ? 'Port *' : 'Clean Version Port'}
                    </label>
                    <input
                      type="number"
                      value={config.cleanPort}
                      onChange={(e) => setConfig(prev => ({ ...prev, cleanPort: e.target.value }))}
                      placeholder="3000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {config.siteType !== 'static' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gray Version Port
                        </label>
                        <input
                          type="number"
                          value={config.grayPort}
                          onChange={(e) => setConfig(prev => ({ ...prev, grayPort: e.target.value }))}
                          placeholder="3001"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Aggressive Port
                        </label>
                        <input
                          type="number"
                          value={config.aggrPort}
                          onChange={(e) => setConfig(prev => ({ ...prev, aggrPort: e.target.value }))}
                          placeholder="3002"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SSL Configuration */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">SSL Configuration</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.requestSSL}
                      onChange={(e) => setConfig(prev => ({ ...prev, requestSSL: e.target.checked }))}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      disabled={!config.domain}
                    />
                    <span className={`text-sm ${!config.domain ? 'text-gray-400' : 'text-gray-700'}`}>
                      Request SSL certificate (Let's Encrypt)
                      {!config.domain && ' (Domain gerekli)'}
                    </span>
                  </label>

                  {config.requestSSL && (
                    <input
                      type="email"
                      value={config.sslEmail}
                      onChange={(e) => setConfig(prev => ({ ...prev, sslEmail: e.target.value }))}
                      placeholder="admin@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Upload Info - only show for ZIP uploads */}
              {uploadResult && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Summary</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Site Type: {uploadResult.siteType}</p>
                    <p>• Size: {uploadResult.size}</p>
                    <p>• Files: {uploadResult.files}</p>
                    <p>• Path: {uploadResult.filePath}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfigSubmit}
                  disabled={deploying}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {deploying ? 'Deploying...' : 'Deploy Site'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Deployment Progress */}
        {step === 3 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {deploymentSuccess ? 'Deployment Complete! 🎉' : 'Deploying...'}
            </h2>

            <div className="bg-gray-900 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
              <div className="font-mono text-sm space-y-1">
                {deploymentLog.map((log, idx) => (
                  <div key={idx} className="text-green-400">
                    {log}
                  </div>
                ))}
                {deploying && (
                  <div className="text-yellow-400 animate-pulse">
                    ▸ Processing...
                  </div>
                )}
              </div>
            </div>

            {deploymentSuccess && siteId && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    Your site has been deployed successfully!
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    You can now access it at: <a href={`https://${config.domain}`} target="_blank" rel="noopener noreferrer" className="underline">{config.domain}</a>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/dashboard/sites')}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/sites/${siteId}`)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Manage Site
                  </button>
                </div>
              </div>
            )}

            {!deploymentSuccess && !deploying && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">
                    Deployment failed. Please check the logs above.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setStep(2);
                    setDeploymentLog([]);
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
  );
}
