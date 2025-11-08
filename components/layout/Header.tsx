'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    // Kullanıcı bilgisini localStorage'dan al
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch (e) {
        console.error('User parse error:', e)
      }
    }
  }, [])

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }

      // LocalStorage'ı temizle
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      
      // Login sayfasına yönlendir
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Hata olsa bile localStorage'ı temizle ve login'e yönlendir
      localStorage.clear()
      router.push('/login')
    }
  }

  return (
    <header className="sticky top-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Ara... (Lead ID, Network, Site)"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-900 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <span className="text-xl">🔔</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold text-gray-900">
                {user?.first_name || 'Admin'} {user?.last_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role || 'admin'}
              </p>
            </div>
            <span className="text-gray-400">▼</span>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500">Oturum açık</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => router.push('/profile')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>👤</span>
                Profil
              </button>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>⚙️</span>
                Ayarlar
              </button>
              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <span>🚪</span>
                  Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
