'use client'

import { useI18n } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, FileText, DollarSign, TrendingUp, User } from 'lucide-react'

export default function DashboardNav() {
  const { t } = useI18n()
  const pathname = usePathname()

  const navItems = [
    {
      href: '/dashboard',
      label: t.nav.dashboard,
      icon: LayoutDashboard
    },
    {
      href: '/dashboard/leads',
      label: t.nav.leads,
      icon: FileText
    },
    {
      href: '/dashboard/commissions',
      label: t.nav.commissions,
      icon: DollarSign
    },
    {
      href: '/dashboard/performance',
      label: t.nav.performance,
      icon: TrendingUp
    },
    {
      href: '/dashboard/profile',
      label: t.nav.profile,
      icon: User
    }
  ]

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-6">
        <div className="flex space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
