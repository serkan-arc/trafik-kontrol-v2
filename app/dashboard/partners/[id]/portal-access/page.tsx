'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Partner {
  id: number
  buyer_code: string
  buyer_name: string
  email: string
  dashboard_username: string | null
  portal_active: boolean
  portal_last_login: string | null
  portal_login_attempts: number
  portal_locked_until: string | null
}

interface LoginHistory {
  id: number
  login_at: string
  ip_address: string
  user_agent: string
  success: boolean
  failure_reason: string | null
}

export default function PortalAccessPage() {
  const params = useParams()
  const router = useRouter()
  const partnerId = params.id as string

  const [partner, setPartner] = useState<Partner | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [generating, setGenerating] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  useEffect(() => {
    if (partnerId) {
      fetchPortalAccess()
    }
  }, [partnerId])

  const fetchPortalAccess = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/partners/${partnerId}/portal-access`)
      if (response.ok) {
        const data = await response.json()
        setPartner(data.partner)
        setLoginHistory(data.loginHistory || [])
        if (data.partner.dashboard_username) {
          setUsername(data.partner.dashboard_username)
        }
      } else {
        setError('Portal erişim bilgileri yüklenemedi')
      }
    } catch (error) {
      console.error('Failed to fetch portal access:', error)
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(password)
    setConfirmPassword(password)
  }

  const handleCreateCredentials = async () => {
    setError('')
    setSuccess('')

    if (!username.trim()) {
      setError('Kullanıcı adı zorunludur')
      return
    }

    if (username.length < 4) {
      setError('Kullanıcı adı en az 4 karakter olmalıdır')
      return
    }

    if (!password) {
      setError('Şifre zorunludur')
      return
    }

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır')
      return
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }

    setGenerating(true)

    try {
      const response = await fetch(`/api/partners/${partnerId}/portal-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Portal erişimi başarıyla oluşturuldu!')
        setPassword('')
        setConfirmPassword('')
        fetchPortalAccess()
      } else {
        setError(data.error || 'Portal erişimi oluşturulamadı')
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setGenerating(false)
    }
  }

  const handleTogglePortal = async () => {
    if (!partner) return

    setToggling(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/partners/${partnerId}/portal-access/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal_active: !partner.portal_active
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(`Portal erişimi ${!partner.portal_active ? 'aktif' : 'pasif'} hale getirildi`)
        fetchPortalAccess()
      } else {
        setError(data.error || 'İşlem başarısız')
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setToggling(false)
    }
  }

  const handleResetPassword = async () => {
    if (!password) {
      setError('Yeni şifre giriniz')
      return
    }

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır')
      return
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }

    setResetting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/partners/${partnerId}/portal-access/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Şifre başarıyla sıfırlandı')
        setPassword('')
        setConfirmPassword('')
      } else {
        setError(data.error || 'Şifre sıfırlanamadı')
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setResetting(false)
    }
  }

  const handleUnlockAccount = async () => {
    setUnlocking(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/partners/${partnerId}/portal-access/unlock`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Hesap kilidi kaldırıldı')
        fetchPortalAccess()
      } else {
        setError(data.error || 'İşlem başarısız')
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setUnlocking(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-600">Portal erişim bilgileri yükleniyor...</div>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Partner bulunamadı
        </div>
        <Link href="/dashboard/partners" className="inline-block mt-4 text-indigo-600 hover:text-indigo-800">
          ← Partner Listesine Dön
        </Link>
      </div>
    )
  }

  const isAccountLocked = partner.portal_locked_until && new Date(partner.portal_locked_until) > new Date()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/partners/${partnerId}`}
          className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
        >
          ← Partner Detayına Dön
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Portal Erişim Yönetimi</h1>
        <p className="text-gray-600 mt-1">
          {partner.buyer_name} ({partner.buyer_code})
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 mb-6">
          {success}
        </div>
      )}

      {/* Current Status */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          📊 Mevcut Durum
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Portal Durumu</p>
            {partner.portal_active ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span className="text-lg font-bold text-green-600">Aktif</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭕</span>
                <span className="text-lg font-bold text-gray-600">Pasif</span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Kullanıcı Adı</p>
            {partner.dashboard_username ? (
              <p className="text-lg font-bold text-gray-900 font-mono">
                {partner.dashboard_username}
              </p>
            ) : (
              <p className="text-lg font-bold text-gray-400">Henüz oluşturulmadı</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Son Giriş</p>
            {partner.portal_last_login ? (
              <p className="text-lg font-bold text-gray-900">
                {new Date(partner.portal_last_login).toLocaleString('tr-TR')}
              </p>
            ) : (
              <p className="text-lg font-bold text-gray-400">Hiç giriş yapılmadı</p>
            )}
          </div>
        </div>

        {/* Account Lock Warning */}
        {isAccountLocked && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div className="flex-1">
                <p className="font-semibold text-red-800 mb-1">Hesap Kilitli</p>
                <p className="text-sm text-red-700 mb-3">
                  Çok fazla başarısız giriş denemesi ({partner.portal_login_attempts} kez).
                  Kilit kalkış zamanı: {new Date(partner.portal_locked_until!).toLocaleString('tr-TR')}
                </p>
                <button
                  onClick={handleUnlockAccount}
                  disabled={unlocking}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {unlocking ? 'Kilid Kaldırılıyor...' : '🔓 Kilidi Kaldır'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3">
          {partner.dashboard_username && (
            <button
              onClick={handleTogglePortal}
              disabled={toggling}
              className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                partner.portal_active
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {toggling
                ? 'İşleniyor...'
                : partner.portal_active
                ? '⭕ Portal Erişimini Pasifleştir'
                : '✅ Portal Erişimini Aktifleştir'
              }
            </button>
          )}
        </div>
      </div>

      {/* Create/Update Credentials */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          {partner.dashboard_username ? '🔐 Şifre Sıfırla' : '🔑 Portal Erişimi Oluştur'}
        </h2>

        <div className="space-y-4">
          {!partner.dashboard_username && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="partner_username"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                En az 4 karakter, özel karakter içermemelidir
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {partner.dashboard_username ? 'Yeni Şifre *' : 'Şifre *'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Güçlü bir şifre girin"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                onClick={generateRandomPassword}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                🎲 Oluştur
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              En az 8 karakter, büyük harf, küçük harf, rakam ve özel karakter içermelidir
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifre Tekrar *
            </label>
            <input
              type="text"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifreyi tekrar girin"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <button
            onClick={partner.dashboard_username ? handleResetPassword : handleCreateCredentials}
            disabled={generating || resetting}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
          >
            {(generating || resetting)
              ? 'İşleniyor...'
              : partner.dashboard_username
              ? '🔄 Şifreyi Sıfırla'
              : '✅ Portal Erişimi Oluştur'
            }
          </button>
        </div>
      </div>

      {/* Login History */}
      {partner.dashboard_username && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📜 Giriş Geçmişi
          </h2>

          {loginHistory.length === 0 ? (
            <p className="text-gray-600 text-center py-6">Henüz giriş geçmişi yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tarih/Saat</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">IP Adresi</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tarayıcı</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((log) => (
                    <tr key={log.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(log.login_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                        {log.ip_address}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.user_agent.substring(0, 50)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {log.success ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            ✅ Başarılı
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800" title={log.failure_reason || ''}>
                            ❌ Başarısız
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Güvenlik Bilgileri</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Şifreler bcrypt ile güvenli şekilde hashlenir ve veritabanında saklanır</li>
          <li>• 5 başarısız giriş denemesinden sonra hesap otomatik olarak 30 dakika kilitlenir</li>
          <li>• Partner sadece kendi lead'lerini görebilir, müşteri PII bilgilerine erişemez</li>
          <li>• Tüm giriş denemeleri IP adresi ile birlikte kaydedilir</li>
          <li>• Portal erişimi pasifleştirildiğinde kullanıcı adı ve şifre silinmez</li>
        </ul>
      </div>
    </div>
  )
}
