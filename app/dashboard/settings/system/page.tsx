'use client'

import { useState, useEffect } from 'react'

interface SystemSettings {
  nginx_log_path: string
  database_host: string
  database_port: number
  redis_host: string
  redis_port: number
  max_domains: number
  auto_refresh_interval: number
  log_retention_days: number
  enable_auto_backup: boolean
  backup_schedule: string
  email_notifications: boolean
  smtp_host: string
  smtp_port: number
  smtp_user: string
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    nginx_log_path: '/var/log/nginx/access.log',
    database_host: 'localhost',
    database_port: 5432,
    redis_host: 'localhost',
    redis_port: 6379,
    max_domains: 100,
    auto_refresh_interval: 30,
    log_retention_days: 90,
    enable_auto_backup: true,
    backup_schedule: 'daily',
    email_notifications: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: ''
  })

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      // Simulated save - gerçek API çağrısı eklenecek
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async (type: 'database' | 'redis') => {
    try {
      // Test connection logic
      alert(`${type} bağlantısı test ediliyor...`)
    } catch (error) {
      console.error(`${type} test failed:`, error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          ⚙️ System Settings
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Global sistem ayarları ve yapılandırma
        </p>
      </div>

      {/* Save Status */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="text-sm text-green-800">Ayarlar başarıyla kaydedildi</span>
        </div>
      )}

      {/* Nginx Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🌐 Nginx Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nginx Access Log Path
            </label>
            <input
              type="text"
              value={settings.nginx_log_path}
              onChange={(e) => setSettings({ ...settings, nginx_log_path: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="/var/log/nginx/access.log"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nginx access log dosyasının tam yolu
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Retention (Days)
            </label>
            <input
              type="number"
              value={settings.log_retention_days}
              onChange={(e) => setSettings({ ...settings, log_retention_days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              min="1"
              max="365"
            />
            <p className="text-xs text-gray-500 mt-1">
              Traffic log kayıtları kaç gün saklanacak
            </p>
          </div>
        </div>
      </div>

      {/* Database Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🗄️ Database Configuration</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Host
              </label>
              <input
                type="text"
                value={settings.database_host}
                onChange={(e) => setSettings({ ...settings, database_host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Port
              </label>
              <input
                type="number"
                value={settings.database_port}
                onChange={(e) => setSettings({ ...settings, database_port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <button
              onClick={() => handleTestConnection('database')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test Database Connection
            </button>
          </div>
        </div>
      </div>

      {/* Redis Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Redis Configuration</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redis Host
              </label>
              <input
                type="text"
                value={settings.redis_host}
                onChange={(e) => setSettings({ ...settings, redis_host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redis Port
              </label>
              <input
                type="number"
                value={settings.redis_port}
                onChange={(e) => setSettings({ ...settings, redis_port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <button
              onClick={() => handleTestConnection('redis')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Test Redis Connection
            </button>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🚀 Performance Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Domains
            </label>
            <input
              type="number"
              value={settings.max_domains}
              onChange={(e) => setSettings({ ...settings, max_domains: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              min="1"
              max="1000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sistemde maksimum kaç domain olabilir
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto Refresh Interval (seconds)
            </label>
            <input
              type="number"
              value={settings.auto_refresh_interval}
              onChange={(e) => setSettings({ ...settings, auto_refresh_interval: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              min="5"
              max="300"
            />
            <p className="text-xs text-gray-500 mt-1">
              Dashboard otomatik yenilenme aralığı
            </p>
          </div>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💾 Backup Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable_auto_backup"
              checked={settings.enable_auto_backup}
              onChange={(e) => setSettings({ ...settings, enable_auto_backup: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="enable_auto_backup" className="text-sm font-medium text-gray-700">
              Enable Automatic Backup
            </label>
          </div>

          {settings.enable_auto_backup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Schedule
              </label>
              <select
                value={settings.backup_schedule}
                onChange={(e) => setSettings({ ...settings, backup_schedule: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="hourly">Her Saat</option>
                <option value="daily">Günlük</option>
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📧 Email Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="email_notifications"
              checked={settings.email_notifications}
              onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="email_notifications" className="text-sm font-medium text-gray-700">
              Enable Email Notifications
            </label>
          </div>

          {settings.email_notifications && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtp_host}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP User
                  </label>
                  <input
                    type="text"
                    value={settings.smtp_user}
                    onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Kaydediliyor...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
