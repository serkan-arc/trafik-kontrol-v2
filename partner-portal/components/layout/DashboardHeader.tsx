'use client'

import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { Globe, LogOut, User, Sun, Moon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardHeader() {
  const { t, locale, setLocale } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'tr' : 'en')
  }

  const handleLogout = () => {
    localStorage.removeItem('partner_token')
    localStorage.removeItem('partner_info')
    router.push('/')
  }

  const partnerInfo = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('partner_info') || '{}')
    : {}

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo & Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            DTEK
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t.auth.partnerPortal}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors border-2 border-gray-200 dark:border-gray-600"
          >
            <Globe className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{locale.toUpperCase()}</span>
          </button>

          {/* Partner Info */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {partnerInfo.buyer_name || 'Partner'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {partnerInfo.buyer_code || ''}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
