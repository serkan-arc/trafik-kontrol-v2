'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface MenuItem {
  label: string
  href: string
  icon: string
  badge?: string
}

const trafficMenuItems: MenuItem[] = [
  { label: 'Traffic Overview', href: '/dashboard/traffic/overview', icon: '📈' },
  { label: 'Master Control', href: '/dashboard/traffic/master', icon: '⚡' },
]

// System Settings - Only system-wide settings remain
const systemSettingsItems: MenuItem[] = [
  { label: 'System Settings', href: '/dashboard/settings/system', icon: '⚙️' },
  { label: 'Users', href: '/dashboard/settings/users', icon: '👤' },
  { label: 'Panel Erişimleri', href: '/dashboard/settings/panel-access', icon: '🔑' },
  { label: 'Notifications', href: '/dashboard/settings/notifications', icon: '📬' },
]

// Site Management - Primary actions
const siteManagementItems: MenuItem[] = [
  { label: 'Siteler', href: '/dashboard/sites', icon: '📋' },
  { label: 'Yeni Site Ekle', href: '/dashboard/sites/deploy', icon: '➕' },
  { label: 'Site Yönetimi', href: '/dashboard/sites/manage', icon: '📂' },
]

// System Information - Read-only monitoring
const systemInfoItems: MenuItem[] = [
  { label: 'Sistem Monitörü', href: 'https://monitor.dtektracking.com', icon: '📊' },
  { label: 'Dosya Yöneticisi', href: 'https://dosya.dtektracking.com', icon: '📁' },
  { label: 'Nginx Yönetimi', href: '/dashboard/sites/nginx', icon: '🔧' },
  { label: 'SSL Sertifikaları', href: '/dashboard/sites/ssl', icon: '🔐' },
  { label: 'PM2 Processes', href: '/dashboard/sites/processes', icon: '⚡' },
  { label: 'Debug Bilgileri', href: '/dashboard/sites/debug', icon: '🔍' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not highlighting active state until mounted
  const getActiveClass = (href: string) => {
    if (!mounted) {
      return 'text-gray-900 hover:bg-indigo-50 hover:text-indigo-600'
    }
    return pathname === href
      ? 'bg-indigo-600 text-white font-semibold'
      : 'text-gray-900 hover:bg-indigo-50 hover:text-indigo-600'
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-indigo-600">
          Traffic Control
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          Advanced Traffic Management
        </p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {/* Traffic Control Menu */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-4 mb-2">
            Traffic Control
          </h3>
          <div className="space-y-1">
            {trafficMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${getActiveClass(item.href)}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Site Management Menu */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-4 mb-2">
            Site Yönetimi
          </h3>
          <div className="space-y-1">
            {siteManagementItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${getActiveClass(item.href)}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* System Settings Menu */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-4 mb-2">
            Sistem Ayarları
          </h3>
          <div className="space-y-1">
            {systemSettingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${getActiveClass(item.href)}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* System Information Menu */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-4 mb-2">
            Sistem Bilgileri
          </h3>
          <div className="space-y-1">
            {systemInfoItems.map((item) => {
              const isExternal = item.href.startsWith('http')
              const LinkComponent = isExternal ? 'a' : Link
              const linkProps = isExternal 
                ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                : { href: item.href }
              
              return (
                <LinkComponent
                  key={item.href}
                  {...linkProps}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${getActiveClass(item.href)}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {isExternal && (
                    <span className="text-gray-400 text-xs">↗</span>
                  )}
                </LinkComponent>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 text-center">
          v2.0.0 - Traffic Control System
        </div>
      </div>
    </aside>
  )
}
