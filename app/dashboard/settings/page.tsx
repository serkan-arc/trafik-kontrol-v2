'use client'

import { useState, useEffect } from 'react'
import { useDarkMode } from '@/contexts/DarkModeContext'

export default function SettingsPage() {
  const { darkMode, toggleDarkMode } = useDarkMode()
  const [notifications, setNotifications] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications') !== 'false'
    const savedAutoRefresh = localStorage.getItem('autoRefresh') !== 'false'
    const savedInterval = parseInt(localStorage.getItem('refreshInterval') || '30')

    setNotifications(savedNotifications)
    setAutoRefresh(savedAutoRefresh)
    setRefreshInterval(savedInterval)
  }, [])

  // Handle notifications toggle
  const handleNotificationsToggle = () => {
    const newNotifications = !notifications
    setNotifications(newNotifications)
    localStorage.setItem('notifications', String(newNotifications))
  }

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = () => {
    const newAutoRefresh = !autoRefresh
    setAutoRefresh(newAutoRefresh)
    localStorage.setItem('autoRefresh', String(newAutoRefresh))
  }

  // Handle refresh interval change
  const handleRefreshIntervalChange = (value: number) => {
    setRefreshInterval(value)
    localStorage.setItem('refreshInterval', String(value))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your application preferences and settings
        </p>
      </div>

      {/* Appearance Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          🎨 Appearance
        </h2>

        <div className="space-y-4">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <h3 className="font-medium text-gray-900">Dark Mode</h3>
              <p className="text-sm text-gray-600">
                Switch between light and dark theme
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                darkMode ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          🔔 Notifications
        </h2>

        <div className="space-y-4">
          {/* Enable Notifications */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <h3 className="font-medium text-gray-900">Enable Notifications</h3>
              <p className="text-sm text-gray-600">
                Receive alerts for important events
              </p>
            </div>
            <button
              onClick={handleNotificationsToggle}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                notifications ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Data & Performance Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          ⚡ Data & Performance
        </h2>

        <div className="space-y-4">
          {/* Auto Refresh */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <h3 className="font-medium text-gray-900">Auto Refresh</h3>
              <p className="text-sm text-gray-600">
                Automatically refresh data on dashboard pages
              </p>
            </div>
            <button
              onClick={handleAutoRefreshToggle}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                autoRefresh ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  autoRefresh ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Refresh Interval */}
          {autoRefresh && (
            <div className="py-3">
              <div className="mb-3">
                <h3 className="font-medium text-gray-900">Refresh Interval</h3>
                <p className="text-sm text-gray-600">
                  How often to refresh data (in seconds)
                </p>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="10"
                  value={refreshInterval}
                  onChange={(e) => handleRefreshIntervalChange(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {refreshInterval}s
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10s</span>
                <span>120s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          ℹ️ System Information
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Version</span>
            <span className="font-medium text-gray-900">v1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Environment</span>
            <span className="font-medium text-gray-900">Development</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Last Updated</span>
            <span className="font-medium text-gray-900">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h2 className="text-xl font-semibold text-red-900 mb-4 flex items-center gap-2">
          ⚠️ Danger Zone
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-red-200">
            <div>
              <h3 className="font-medium text-red-900">Debug Info</h3>
              <p className="text-sm text-red-700">
                Show current dark mode state in console
              </p>
            </div>
            <button
              onClick={() => {
                console.log('=== DARK MODE DEBUG ===')
                console.log('localStorage darkMode:', localStorage.getItem('darkMode'))
                console.log('HTML classes:', document.documentElement.classList.toString())
                console.log('Context darkMode:', darkMode)
                alert(`localStorage: ${localStorage.getItem('darkMode')}\nHTML classes: ${document.documentElement.classList.toString()}\nContext: ${darkMode}`)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔍 Debug
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-red-200">
            <div>
              <h3 className="font-medium text-red-900">Force Dark Mode</h3>
              <p className="text-sm text-red-700">
                Force enable dark mode (for testing)
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('darkMode', 'true')
                document.documentElement.classList.add('dark')
                window.location.reload()
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              🌙 Force Dark
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-red-200">
            <div>
              <h3 className="font-medium text-red-900">Force Light Mode</h3>
              <p className="text-sm text-red-700">
                Force enable light mode (for testing)
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('darkMode', 'false')
                document.documentElement.classList.remove('dark')
                window.location.reload()
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              ☀️ Force Light
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-red-900">Clear Cache</h3>
              <p className="text-sm text-red-700">
                Clear all cached data and refresh
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all cached data?')) {
                  localStorage.clear()
                  window.location.reload()
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
