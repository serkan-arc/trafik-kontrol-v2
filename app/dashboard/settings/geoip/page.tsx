'use client'

import { useState } from 'react'

interface GeoIPResult {
  ip: string
  country?: string
  countryCode?: string
  region?: string
  regionCode?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
  isp?: string
  org?: string
  as?: string
  asName?: string
  isEU?: boolean
  isProxy?: boolean
  isVPN?: boolean
  isTor?: boolean
  isHosting?: boolean
  isMobile?: boolean
  source: 'maxmind' | 'ipinfo' | 'ipapi' | 'cache'
}

export default function GeoIPPage() {
  const [testIP, setTestIP] = useState('')
  const [result, setResult] = useState<GeoIPResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleLookup = async () => {
    if (!testIP.trim()) {
      setError('Please enter an IP address')
      return
    }
    
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      const response = await fetch(`/api/geoip/lookup?ip=${encodeURIComponent(testIP.trim())}`)
      const data = await response.json()
      
      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error || 'Lookup failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleMyIP = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      const response = await fetch('/api/geoip/lookup')
      const data = await response.json()
      
      if (data.success) {
        setResult(data.data)
        setTestIP(data.data.ip)
      } else {
        setError(data.error || 'Lookup failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }
  
  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode === 'XX' || countryCode === 'LOCAL') {
      return '🏳️'
    }
    
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    
    return String.fromCodePoint(...codePoints)
  }
  
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'maxmind': return 'text-blue-600 bg-blue-50'
      case 'ipinfo': return 'text-green-600 bg-green-50'
      case 'ipapi': return 'text-purple-600 bg-purple-50'
      case 'cache': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🌍 GeoIP Integration</h1>
        <p className="text-gray-600 mt-1">IP geolocation service configuration and testing</p>
      </div>
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Primary Provider</div>
          <div className="text-lg font-semibold text-gray-900 mt-2">
            {process.env.IPINFO_API_KEY ? '✅ IPinfo.io' : '⚠️ IP-API (Free)'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {process.env.IPINFO_API_KEY 
              ? 'Accurate, with privacy detection' 
              : 'Rate limited, basic info'}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Caching</div>
          <div className="text-lg font-semibold text-green-900 mt-2">
            ✅ In-Memory
          </div>
          <div className="text-xs text-gray-500 mt-1">24-hour TTL</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Features</div>
          <div className="text-xs text-gray-900 mt-2 space-y-1">
            <div>✅ Country & City Detection</div>
            <div>✅ VPN/Proxy/Tor Detection</div>
            <div>✅ ISP & ASN Information</div>
            <div>✅ Timezone & Coordinates</div>
          </div>
        </div>
      </div>
      
      {/* Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IPinfo.io API Key (Recommended)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={process.env.IPINFO_API_KEY || ''}
                disabled
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="Set IPINFO_API_KEY in environment variables"
              />
              <a
                href="https://ipinfo.io/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                Get API Key
              </a>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Free tier: 50,000 requests/month • Paid tiers available for higher volume
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
            <div className="font-medium text-blue-900 mb-2">💡 Setup Instructions:</div>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Sign up at <a href="https://ipinfo.io/signup" target="_blank" rel="noopener noreferrer" className="underline">ipinfo.io</a></li>
              <li>Get your API key from the dashboard</li>
              <li>Add to your environment: <code className="bg-blue-100 px-1 rounded">IPINFO_API_KEY=your_key_here</code></li>
              <li>Restart the application</li>
            </ol>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
            <div className="font-medium text-yellow-900 mb-2">⚠️ Without API Key:</div>
            <div className="text-yellow-700">
              The system will use ip-api.com as a free fallback. This has a rate limit of 45 requests per minute 
              and doesn't provide VPN/Proxy detection. For production use, IPinfo.io is strongly recommended.
            </div>
          </div>
        </div>
      </div>
      
      {/* Testing Tool */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Test GeoIP Lookup</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IP Address to Lookup
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={testIP}
                onChange={(e) => setTestIP(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 8.8.8.8"
              />
              <button
                onClick={handleLookup}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Looking up...' : 'Lookup'}
              </button>
              <button
                onClick={handleMyIP}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
              >
                My IP
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
              ❌ {error}
            </div>
          )}
          
          {result && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getCountryFlag(result.countryCode || '')}</span>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {result.country || 'Unknown Country'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.city ? `${result.city}, ` : ''}{result.region || 'Unknown Region'}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded font-medium ${getSourceColor(result.source)}`}>
                    {result.source}
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs uppercase mb-1">IP Address</div>
                    <div className="font-mono text-gray-900">{result.ip}</div>
                  </div>
                  
                  {result.countryCode && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">Country Code</div>
                      <div className="font-semibold text-gray-900">{result.countryCode}</div>
                    </div>
                  )}
                  
                  {result.timezone && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">Timezone</div>
                      <div className="text-gray-900">{result.timezone}</div>
                    </div>
                  )}
                  
                  {result.isp && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">ISP</div>
                      <div className="text-gray-900">{result.isp}</div>
                    </div>
                  )}
                  
                  {result.org && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">Organization</div>
                      <div className="text-gray-900">{result.org}</div>
                    </div>
                  )}
                  
                  {result.as && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">ASN</div>
                      <div className="font-mono text-gray-900">{result.as}</div>
                    </div>
                  )}
                  
                  {result.latitude !== undefined && result.longitude !== undefined && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">Coordinates</div>
                      <div className="font-mono text-gray-900">
                        {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                      </div>
                    </div>
                  )}
                  
                  {/* Security Flags */}
                  <div className="col-span-2">
                    <div className="text-gray-500 text-xs uppercase mb-2">Security Flags</div>
                    <div className="flex flex-wrap gap-2">
                      {result.isVPN && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 font-medium">
                          🔒 VPN
                        </span>
                      )}
                      {result.isProxy && (
                        <span className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 font-medium">
                          🔀 Proxy
                        </span>
                      )}
                      {result.isTor && (
                        <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 font-medium">
                          🧅 Tor
                        </span>
                      )}
                      {result.isHosting && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 font-medium">
                          🖥️ Hosting
                        </span>
                      )}
                      {result.isMobile && (
                        <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 font-medium">
                          📱 Mobile
                        </span>
                      )}
                      {!result.isVPN && !result.isProxy && !result.isTor && !result.isHosting && !result.isMobile && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          ✅ Regular Connection
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Map Preview (placeholder) */}
                {result.latitude !== undefined && result.longitude !== undefined && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">📍 Map Location:</div>
                    <a
                      href={`https://www.google.com/maps?q=${result.latitude},${result.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm underline"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Usage Examples */}
      <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">💻 Usage Examples</h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium text-gray-900 mb-2">Server-side (API Route):</div>
            <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-xs whitespace-pre">
{`import { lookupGeoIP } from '@/lib/geoip'

const geoInfo = await lookupGeoIP('8.8.8.8')
console.log(geoInfo.country, geoInfo.city)`}
            </code>
          </div>
          
          <div>
            <div className="font-medium text-gray-900 mb-2">Client-side (Frontend):</div>
            <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-xs whitespace-pre">
{`const response = await fetch('/api/geoip/lookup?ip=8.8.8.8')
const data = await response.json()
console.log(data.data.country)`}
            </code>
          </div>
          
          <div>
            <div className="font-medium text-gray-900 mb-2">Batch Lookup:</div>
            <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-xs whitespace-pre">
{`const response = await fetch('/api/geoip/lookup?ips=8.8.8.8,1.1.1.1')
const data = await response.json()
// Returns object with IPs as keys`}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
