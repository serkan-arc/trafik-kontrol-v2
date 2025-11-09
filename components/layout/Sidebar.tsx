'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface MenuItem {
  label: string
  href: string
  icon: string
  badge?: string
}

interface MenuSection {
  id: string
  title: string
  icon: string
  items: MenuItem[]
}

const menuSections: MenuSection[] = [
  {
    id: 'traffic',
    title: 'Traffic Control',
    icon: '📈',
    items: [
      { label: 'Traffic Overview', href: '/dashboard/traffic/overview', icon: '📈' },
      { label: 'Master Control', href: '/dashboard/traffic/master', icon: '⚡' },
    ]
  },
  {
    id: 'sites',
    title: 'Site Yönetimi',
    icon: '🌐',
    items: [
      { label: 'Siteler', href: '/dashboard/sites', icon: '📋' },
      { label: 'Yeni Site Ekle', href: '/dashboard/sites/deploy', icon: '➕' },
      { label: 'Site Yönetimi', href: '/dashboard/sites/manage', icon: '📂' },
    ]
  },
  {
    id: 'n8n-management',
    title: 'n8n Yönetimi',
    icon: '⚡',
    items: [
      { label: 'n8n Dashboard', href: '/dashboard/n8n', icon: '📊' },
      { label: 'Workflow\'lar', href: '/dashboard/n8n/workflows', icon: '🔄' },
      { label: 'Webhook Logları', href: '/dashboard/n8n/webhooks', icon: '📨' },
      { label: 'n8n Panel', href: 'https://n8n.dtektracking.com', icon: '⚙️' },
      { label: 'Hata Logları', href: '/dashboard/n8n/errors', icon: '⚠️' },
    ]
  },
  {
    id: 'lead-management',
    title: 'Lead Yönetimi',
    icon: '📋',
    items: [
      { label: 'Lead Havuzu', href: '/dashboard/leads/pool', icon: '🗂️' },
      { label: 'Paket Yönetimi', href: '/dashboard/leads/packages', icon: '📦' },
      { label: 'Paket Geçmişi', href: '/dashboard/leads/history', icon: '📋' },
      { label: 'Lead Raporları', href: '/dashboard/leads/reports', icon: '📊' },
    ]
  },
  {
    id: 'buyer-management',
    title: 'Alıcı Yönetimi',
    icon: '👥',
    items: [
      { label: 'Alıcı Listesi', href: '/dashboard/buyers', icon: '📇' },
      { label: 'Yeni Alıcı Ekle', href: '/dashboard/buyers/new', icon: '➕' },
      { label: 'Anlaşmalar', href: '/dashboard/buyers/deals', icon: '💰' },
      { label: 'Alıcı Performansı', href: '/dashboard/buyers/performance', icon: '📊' },
    ]
  },
  {
    id: 'commission-management',
    title: 'Komisyon Yönetimi',
    icon: '💰',
    items: [
      { label: 'Komisyon Listesi', href: '/dashboard/commissions', icon: '💵' },
      { label: 'Onay Bekleyenler', href: '/dashboard/commissions/pending', icon: '✅' },
      { label: 'Ödeme Geçmişi', href: '/dashboard/commissions/paid', icon: '💸' },
      { label: 'Komisyon Raporları', href: '/dashboard/commissions/reports', icon: '📊' },
    ]
  },
  {
    id: 'product-management',
    title: 'Ürün Yönetimi',
    icon: '📦',
    items: [
      { label: 'Ürün Listesi', href: '/dashboard/products', icon: '🏷️' },
      { label: 'Yeni Ürün Ekle', href: '/dashboard/products/new', icon: '➕' },
      { label: 'Ürün Performansı', href: '/dashboard/products/performance', icon: '📊' },
    ]
  },
  {
    id: 'reporting',
    title: 'Raporlama',
    icon: '📊',
    items: [
      { label: 'Genel Dashboard', href: '/dashboard/reports', icon: '📈' },
      { label: 'Performans Raporları', href: '/dashboard/reports/performance', icon: '📉' },
      { label: 'Finansal Raporlar', href: '/dashboard/reports/financial', icon: '💹' },
      { label: 'Excel Export', href: '/dashboard/reports/export', icon: '📥' },
    ]
  },
  {
    id: 'settings',
    title: 'Sistem Ayarları',
    icon: '⚙️',
    items: [
      { label: 'System Settings', href: '/dashboard/settings/system', icon: '⚙️' },
      { label: 'Users', href: '/dashboard/settings/users', icon: '👤' },
      { label: 'Panel Erişimleri', href: '/dashboard/settings/panel-access', icon: '🔑' },
      { label: 'Notifications', href: '/dashboard/settings/notifications', icon: '📬' },
    ]
  },
  {
    id: 'system-info',
    title: 'Sistem Bilgileri',
    icon: '📊',
    items: [
      { label: 'Sistem Monitörü', href: 'https://monitor.dtektracking.com', icon: '📊' },
      { label: 'Dosya Yöneticisi', href: 'https://dosya.dtektracking.com', icon: '📁' },
      { label: 'Nginx Yönetimi', href: '/dashboard/sites/nginx', icon: '🔧' },
      { label: 'SSL Sertifikaları', href: '/dashboard/sites/ssl', icon: '🔐' },
      { label: 'PM2 Processes', href: '/dashboard/sites/processes', icon: '⚡' },
      { label: 'Debug Bilgileri', href: '/dashboard/sites/debug', icon: '🔍' },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    traffic: true,
    sites: true,
    'n8n-management': true,
    'lead-management': true,
    'buyer-management': true,
    'commission-management': true,
    'product-management': true,
    'reporting': true,
    settings: true,
    'system-info': true,
  })

  useEffect(() => {
    setMounted(true)
    // Load expanded state from localStorage
    const saved = localStorage.getItem('sidebar-expanded')
    if (saved) {
      try {
        setExpandedSections(JSON.parse(saved))
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [sectionId]: !prev[sectionId] }
      // Save to localStorage
      localStorage.setItem('sidebar-expanded', JSON.stringify(newState))
      return newState
    })
  }

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
        {menuSections.map((section) => (
          <div key={section.id} className="mb-2">
            {/* Section Header - Clickable to expand/collapse */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-base">{section.icon}</span>
              <span className="flex-1 text-left">{section.title}</span>
              {expandedSections[section.id] ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {/* Section Items - Show/Hide based on expanded state */}
            {expandedSections[section.id] && (
              <div className="mt-1 space-y-1">
                {section.items.map((item) => {
                  const isExternal = item.href.startsWith('http')
                  const LinkComponent = isExternal ? 'a' : Link
                  const linkProps = isExternal 
                    ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                    : { href: item.href }
                  
                  return (
                    <LinkComponent
                      key={item.href}
                      {...linkProps}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${getActiveClass(item.href)}`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
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
            )}
          </div>
        ))}
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
