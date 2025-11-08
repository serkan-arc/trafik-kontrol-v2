'use client'

import { useState } from 'react'

interface RateLimitConfig {
  name: string
  description: string
  maxRequests: number
  windowMs: number
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket'
  enabled: boolean
  appliesTo: string[]
}

export default function RateLimitingPage() {
  const [configs, setConfigs] = useState<RateLimitConfig[]>([
    {
      name: 'API Standard',
      description: 'Standard rate limit for most API endpoints',
      maxRequests: 100,
      windowMs: 60000,
      strategy: 'fixed-window',
      enabled: true,
      appliesTo: ['/api/traffic/*', '/api/global/*']
    },
    {
      name: 'Authentication Strict',
      description: 'Strict limit for login and authentication endpoints',
      maxRequests: 5,
      windowMs: 60000,
      strategy: 'sliding-window',
      enabled: true,
      appliesTo: ['/api/auth/*']
    },
    {
      name: 'Public API Relaxed',
      description: 'Relaxed limit for public-facing APIs',
      maxRequests: 300,
      windowMs: 60000,
      strategy: 'token-bucket',
      enabled: true,
      appliesTo: ['/api/public/*']
    }
  ])
  
  const [showModal, setShowModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<RateLimitConfig | null>(null)
  const [formData, setFormData] = useState<RateLimitConfig>({
    name: '',
    description: '',
    maxRequests: 100,
    windowMs: 60000,
    strategy: 'fixed-window',
    enabled: true,
    appliesTo: []
  })
  
  const handleCreateConfig = () => {
    setEditingConfig(null)
    setFormData({
      name: '',
      description: '',
      maxRequests: 100,
      windowMs: 60000,
      strategy: 'fixed-window',
      enabled: true,
      appliesTo: []
    })
    setShowModal(true)
  }
  
  const handleEditConfig = (config: RateLimitConfig) => {
    setEditingConfig(config)
    setFormData({ ...config })
    setShowModal(true)
  }
  
  const handleSaveConfig = () => {
    if (editingConfig) {
      setConfigs(configs.map(c => c.name === editingConfig.name ? formData : c))
    } else {
      setConfigs([...configs, formData])
    }
    setShowModal(false)
  }
  
  const handleDeleteConfig = (name: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      setConfigs(configs.filter(c => c.name !== name))
    }
  }
  
  const handleToggleConfig = (name: string) => {
    setConfigs(configs.map(c => 
      c.name === name ? { ...c, enabled: !c.enabled } : c
    ))
  }
  
  const getStrategyDescription = (strategy: string) => {
    const descriptions: Record<string, string> = {
      'fixed-window': 'Resets counter at fixed intervals (simple, efficient)',
      'sliding-window': 'Smooth rolling window (accurate, more expensive)',
      'token-bucket': 'Refills tokens over time (allows bursts)'
    }
    return descriptions[strategy] || strategy
  }
  
  const formatWindowTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${ms / 1000}s`
    if (ms < 3600000) return `${ms / 60000}min`
    return `${ms / 3600000}h`
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">⏱️ API Rate Limiting</h1>
        <p className="text-gray-600 mt-1">Configure rate limits to protect your APIs from abuse</p>
      </div>
      
      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-900">What is Rate Limiting?</div>
          <div className="text-xs text-blue-700 mt-2">
            Controls how many requests a client can make within a time window. Protects against abuse and ensures fair usage.
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm font-medium text-green-900">Active Configurations</div>
          <div className="text-2xl font-bold text-green-900 mt-2">
            {configs.filter(c => c.enabled).length}
          </div>
          <div className="text-xs text-green-700">
            {configs.length} total configs
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm font-medium text-purple-900">Storage</div>
          <div className="text-sm text-purple-700 mt-2">
            {process.env.REDIS_URL ? '✅ Redis (Recommended)' : '⚠️ In-Memory (Basic)'}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {!process.env.REDIS_URL && 'Configure REDIS_URL for production'}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Rate Limit Configurations</h2>
            <p className="text-sm text-gray-600 mt-1">Define limits for different API endpoints</p>
          </div>
          <button
            onClick={handleCreateConfig}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            + Add Configuration
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {configs.map((config) => (
              <div key={config.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold text-gray-900">{config.name}</div>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        config.enabled 
                          ? 'bg-green-50 text-green-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 font-medium">
                        {config.strategy}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">{config.description}</div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <div className="text-gray-500 text-xs">Max Requests</div>
                        <div className="font-semibold text-gray-900">{config.maxRequests}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Time Window</div>
                        <div className="font-semibold text-gray-900">{formatWindowTime(config.windowMs)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Rate</div>
                        <div className="font-semibold text-gray-900">
                          {config.maxRequests} req/{formatWindowTime(config.windowMs)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Applies to:</span> {config.appliesTo.join(', ')}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Strategy:</span> {getStrategyDescription(config.strategy)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={() => handleToggleConfig(config.name)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    
                    <button
                      onClick={() => handleEditConfig(config)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.name)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Implementation Guide */}
      <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">📚 Implementation Guide</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <div className="font-medium text-gray-900 mb-1">1. Import the rate limiter:</div>
            <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-xs">
              import &#123; createRateLimiter, RateLimitPresets &#125; from '@/lib/rate-limiter'
            </code>
          </div>
          
          <div>
            <div className="font-medium text-gray-900 mb-1">2. Create a limiter instance:</div>
            <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-xs whitespace-pre">
{`const limiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  strategy: 'fixed-window',
  keyPrefix: 'api:my-endpoint'
})`}
            </code>
          </div>
          
          <div>
            <div className="font-medium text-gray-900 mb-1">3. Wrap your API handler:</div>
            <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-xs whitespace-pre">
{`export async function GET(request: NextRequest) {
  return limiter(request, async () => {
    // Your API logic here
    return NextResponse.json({ success: true })
  })
}`}
            </code>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800">
            <div className="font-medium mb-1">⚠️ Important Notes:</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Rate limits are per IP address by default</li>
              <li>Use Redis for production (set REDIS_URL environment variable)</li>
              <li>Consider using 'sliding-window' or 'token-bucket' for critical endpoints</li>
              <li>Monitor rate limit headers in responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingConfig ? 'Edit Configuration' : 'Create Configuration'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., API Standard"
                  disabled={!!editingConfig}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Describe when this rate limit applies"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Requests *
                  </label>
                  <input
                    type="number"
                    value={formData.maxRequests}
                    onChange={(e) => setFormData({ ...formData, maxRequests: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Window (ms) *
                  </label>
                  <input
                    type="number"
                    value={formData.windowMs}
                    onChange={(e) => setFormData({ ...formData, windowMs: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1000"
                    step="1000"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    1 minute = 60000ms
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strategy *
                </label>
                <select
                  value={formData.strategy}
                  onChange={(e) => setFormData({ ...formData, strategy: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="fixed-window">Fixed Window</option>
                  <option value="sliding-window">Sliding Window</option>
                  <option value="token-bucket">Token Bucket</option>
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  {getStrategyDescription(formData.strategy)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applies To (API paths, comma-separated) *
                </label>
                <input
                  type="text"
                  value={formData.appliesTo.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    appliesTo: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="/api/traffic/*, /api/global/*"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingConfig ? 'Save Changes' : 'Create Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
