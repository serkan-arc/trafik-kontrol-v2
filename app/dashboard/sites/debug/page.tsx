'use client';

import { useState, useEffect } from 'react';

interface PM2Process {
  pm_id: number;
  name: string;
  pid: number;
  status: string;
  port?: number;
  memory: number;
  cpu: number;
}

interface PortMapping {
  port: number;
  pm2_process?: string;
  pid?: number;
  site_domain?: string;
}

export default function DebugPage() {
  const [pm2Processes, setPM2Processes] = useState<PM2Process[]>([]);
  const [portMappings, setPortMappings] = useState<PortMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    try {
      const res = await fetch('/api/sites/debug');
      const data = await res.json();
      
      if (data.success) {
        setPM2Processes(data.pm2_processes || []);
        setPortMappings(data.port_mappings || []);
      }
    } catch (error) {
      console.error('Error fetching debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Debug: PM2 & Port Mapping</h1>
        <p className="text-gray-600 mt-1">PM2 process'lerin ve port eşleşmelerinin kontrolü</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* PM2 Processes */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">PM2 Processes ({pm2Processes.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port (ENV)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memory</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pm2Processes.map((proc) => (
                    <tr key={proc.pm_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{proc.pm_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{proc.name}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{proc.pid}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          proc.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {proc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">
                        {proc.port || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{Math.round(proc.memory / 1024 / 1024)}MB</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{proc.cpu}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Port Mappings */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Port Mappings ({portMappings.length})</h2>
              <p className="text-sm text-gray-600 mt-1">Hangi port hangi PM2 process tarafından kullanılıyor</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PM2 Process</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site Domain (DB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {portMappings.map((mapping, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono font-bold text-indigo-600">{mapping.port}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{mapping.pm2_process || '-'}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{mapping.pid || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{mapping.site_domain || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Bu Sayfa Ne İçin?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Site silerken hangi PM2 process'in durduğunu görmek için</li>
              <li>• Port-Process eşleşmesini kontrol etmek için</li>
              <li>• Veritabanındaki site kayıtlarıyla PM2 process'lerin uyumunu test etmek için</li>
              <li>• Problem yaşarsanız bu sayfadaki bilgileri paylaşabilirsiniz</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
