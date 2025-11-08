'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface IPDetail {
  ip: string;
  country?: string;
  city?: string;
  isp?: string;
  device_type?: string;
  os?: string;
  browser?: string;
  visit_count: number;
  form_submissions: number;
  risk_score: number;
  spam_score: number;
  bot_score: number;
  list_status: string;
  first_seen: string;
  last_seen: string;
  is_bot?: boolean;
  bot_type?: string;
}

interface Visit {
  id: string;
  visited_at: string;
  page_url: string;
  referrer?: string;
  user_agent?: string;
  session_duration?: number;
}

export default function IPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ip = params.ip as string;

  const [ipDetail, setIpDetail] = useState<IPDetail | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'risk' | 'forms' | 'notes'>('activity');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (ip) {
      fetchIPDetail();
      fetchVisits();
    }
  }, [ip]);

  const fetchIPDetail = async () => {
    try {
      const res = await fetch(`/api/traffic/ips/${encodeURIComponent(ip)}`);
      const data = await res.json();
      if (data.success) {
        setIpDetail(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch IP details:', error);
    }
  };

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/traffic/ips/${encodeURIComponent(ip)}/visits?limit=20`);
      const data = await res.json();
      if (data.success) {
        setVisits(data.data.visits);
      }
    } catch (error) {
      console.error('Failed to fetch visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string) => {
    if (!confirm(`Are you sure you want to: ${action}?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/traffic/ips/${encodeURIComponent(ip)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Action "${action}" completed successfully!`);
        fetchIPDetail(); // Refresh data
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 50) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (score >= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getListBadge = (status: string) => {
    const badges = {
      whitelist: 'bg-green-500 text-white',
      graylist: 'bg-yellow-500 text-white',
      blacklist: 'bg-red-500 text-white',
      unknown: 'bg-gray-500 text-white',
    };
    return badges[status as keyof typeof badges] || badges.unknown;
  };

  if (!ipDetail) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading IP details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/dashboard/traffic/ips" className="hover:text-blue-600">
          IP Management
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{ip}</span>
      </div>

      {/* IP Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold font-mono">{ip}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getListBadge(ipDetail.list_status)}`}>
                {ipDetail.list_status.toUpperCase()}
              </span>
            </div>
            
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500">Country</div>
                <div className="text-sm font-medium">{ipDetail.country || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">City</div>
                <div className="text-sm font-medium">{ipDetail.city || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ISP</div>
                <div className="text-sm font-medium">{ipDetail.isp || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Device</div>
                <div className="text-sm font-medium">{ipDetail.device_type || '-'}</div>
              </div>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          <div className="relative">
            <details className="group">
              <summary className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer list-none">
                Quick Actions ▾
              </summary>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-10 py-1">
                <button
                  onClick={() => performAction('whitelist')}
                  disabled={actionLoading}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm disabled:opacity-50"
                >
                  ✓ Add to Whitelist
                </button>
                <button
                  onClick={() => performAction('graylist')}
                  disabled={actionLoading}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm disabled:opacity-50"
                >
                  ⚠ Add to Graylist
                </button>
                <button
                  onClick={() => performAction('blacklist')}
                  disabled={actionLoading}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm disabled:opacity-50"
                >
                  ✕ Add to Blacklist
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => performAction('reset_risk_score')}
                  disabled={actionLoading}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm disabled:opacity-50"
                >
                  ↻ Reset Risk Score
                </button>
                <button
                  onClick={() => performAction('block_permanently')}
                  disabled={actionLoading}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm disabled:opacity-50"
                >
                  🚫 Block Permanently
                </button>
              </div>
            </details>
          </div>
        </div>

        {/* Risk Scores */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border-2 ${getRiskColor(ipDetail.risk_score)}`}>
            <div className="text-xs font-medium opacity-75">Risk Score</div>
            <div className="text-3xl font-bold mt-1">{ipDetail.risk_score}</div>
          </div>
          <div className={`p-4 rounded-lg border-2 ${getRiskColor(ipDetail.spam_score)}`}>
            <div className="text-xs font-medium opacity-75">Spam Score</div>
            <div className="text-3xl font-bold mt-1">{ipDetail.spam_score}</div>
          </div>
          <div className={`p-4 rounded-lg border-2 ${getRiskColor(ipDetail.bot_score)}`}>
            <div className="text-xs font-medium opacity-75">Bot Score</div>
            <div className="text-3xl font-bold mt-1">{ipDetail.bot_score}</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Visits</div>
          <div className="text-2xl font-bold mt-1">{ipDetail.visit_count}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Form Submissions</div>
          <div className="text-2xl font-bold mt-1">{ipDetail.form_submissions}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">First Seen</div>
          <div className="text-sm font-medium mt-1">
            {new Date(ipDetail.first_seen).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Last Seen</div>
          <div className="text-sm font-medium mt-1">
            {new Date(ipDetail.last_seen).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {(['activity', 'risk', 'forms', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Visit History</h3>
              {loading ? (
                <div className="text-center py-8 text-gray-600">Loading visits...</div>
              ) : visits.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No visits recorded</div>
              ) : (
                <div className="space-y-3">
                  {visits.map((visit) => (
                    <div key={visit.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-blue-600 hover:underline">
                            {visit.page_url}
                          </div>
                          {visit.referrer && (
                            <div className="text-xs text-gray-500 mt-1">
                              Referrer: {visit.referrer}
                            </div>
                          )}
                          {visit.user_agent && (
                            <div className="text-xs text-gray-500 mt-1">
                              UA: {visit.user_agent.substring(0, 100)}...
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                          {new Date(visit.visited_at).toLocaleString()}
                        </div>
                      </div>
                      {visit.session_duration && (
                        <div className="mt-2 text-xs text-gray-600">
                          Session: {Math.floor(visit.session_duration / 60)}m {visit.session_duration % 60}s
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Risk Analysis Tab */}
          {activeTab === 'risk' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">Risk Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Overall Risk</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${ipDetail.risk_score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold">{ipDetail.risk_score}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Spam Likelihood</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full"
                            style={{ width: `${ipDetail.spam_score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold">{ipDetail.spam_score}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bot Probability</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-600 h-2 rounded-full"
                            style={{ width: `${ipDetail.bot_score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold">{ipDetail.bot_score}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {ipDetail.is_bot && (
                  <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                    <h4 className="font-medium text-sm mb-2 text-yellow-800">Bot Detection</h4>
                    <p className="text-sm">This IP has been identified as a bot.</p>
                    {ipDetail.bot_type && (
                      <p className="text-sm mt-1">Type: <span className="font-semibold">{ipDetail.bot_type}</span></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Forms Tab */}
          {activeTab === 'forms' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Form Submissions</h3>
              <div className="text-center py-8 text-gray-600">
                Form submission history coming soon...
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <div className="space-y-4">
                <textarea
                  placeholder="Add notes about this IP..."
                  className="w-full px-4 py-3 border rounded-lg resize-none h-32"
                  disabled
                />
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" disabled>
                  Save Note (Coming Soon)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
