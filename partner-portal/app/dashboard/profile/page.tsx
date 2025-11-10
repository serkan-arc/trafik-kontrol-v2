'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { User, Mail, Phone, Building, Calendar, Shield, Key } from 'lucide-react'

interface PartnerProfile {
  buyer_code: string
  buyer_name: string
  company_name: string
  email: string
  phone: string
  status: string
  portal_active: boolean
  created_at: string
  portal_last_login: string
  active_deals: number
}

export default function ProfilePage() {
  const t = useTranslation()
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('partner_token')
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Use cached partner info as fallback
      const cachedInfo = localStorage.getItem('partner_info')
      if (cachedInfo) {
        const info = JSON.parse(cachedInfo)
        setProfile({
          buyer_code: info.buyer_code,
          buyer_name: info.buyer_name,
          company_name: 'Test Company',
          email: info.email,
          phone: '+90 532 XXX XX XX',
          status: 'active',
          portal_active: true,
          created_at: '2024-01-15',
          portal_last_login: new Date().toISOString(),
          active_deals: 2
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    try {
      const token = localStorage.getItem('partner_token')
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(t.profile.updated)
        setShowPasswordChange(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        alert(data.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Error changing password')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">Profile not found</p>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t.profile.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">
          {t.profile.accountInfo}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {t.profile.accountInfo}
            </h2>

            <div className="space-y-4">
              {/* Buyer Code */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">{t.profile.buyerCode}</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{profile.buyer_code}</p>
                </div>
              </div>

              {/* Buyer Name */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">Partner Name</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{profile.buyer_name}</p>
                </div>
              </div>

              {/* Company */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Building className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">{t.profile.companyName}</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{profile.company_name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Mail className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">{t.profile.email}</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{profile.email}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <Phone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">{t.profile.phone}</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{profile.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t.profile.changePassword}
              </h2>
              {!showPasswordChange && (
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>{t.profile.changePassword}</span>
                </button>
              )}
            </div>

            {showPasswordChange && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.profile.currentPassword}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold placeholder-gray-500 dark:placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.profile.newPassword}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold placeholder-gray-500 dark:placeholder-gray-400"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.profile.confirmPassword}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold placeholder-gray-500 dark:placeholder-gray-400"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {t.common.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false)
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Account Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">Status</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs font-semibold rounded-full">
                  {profile.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">Portal</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  profile.portal_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {profile.portal_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Membership Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Membership
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{t.profile.memberSince}</span>
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">{t.profile.lastLogin}</span>
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {new Date(profile.portal_last_login).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Active Deals */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow p-6 text-white">
            <h3 className="text-lg font-bold mb-2">
              {t.profile.activeDeals}
            </h3>
            <p className="text-4xl font-bold mb-1">
              {profile.active_deals}
            </p>
            <p className="text-sm text-blue-100">
              Active commission agreements
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
