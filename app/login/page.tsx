'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Lock, Mail, AlertCircle, Activity } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success && data.token) {
        // Token'ı localStorage'e kaydet
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Dashboard'a yönlendir
        router.push('/dashboard/traffic/overview')
      } else {
        setError(data.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-sm w-full relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">
            Traffic Control System
          </h1>
          <p className="text-white/70 flex items-center justify-center gap-2 text-sm">
            <Activity className="w-3 h-3" />
            Advanced Traffic Management & Analytics
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white mb-1">
              Hoş Geldiniz
            </h2>
            <p className="text-white/60 text-xs">
              Sisteme giriş yapmak için bilgilerinizi girin
            </p>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-500/20 backdrop-blur-lg border border-red-500/50 text-red-200 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-white/90 mb-1.5">
                E-posta Adresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-white/40" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  placeholder="ornek@sirket.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-white/90 mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-white/40" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center">
                <input type="checkbox" className="w-3.5 h-3.5 bg-white/10 border-white/20 rounded text-indigo-600 focus:ring-white/50" />
                <span className="ml-1.5 text-white/70">Beni hatırla</span>
              </label>
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                Şifremi unuttum
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Giriş yapılıyor...
                </span>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-4 p-3 bg-white/5 backdrop-blur-lg rounded-lg border border-white/10">
            <div className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-white/80 mb-0.5">Güvenli Bağlantı</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  Bilgileriniz 256-bit şifreleme ile korunmaktadır.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-5">
          <p className="text-white/40 text-xs">
            © 2025 Traffic Control System
          </p>
          <p className="text-white/30 text-xs mt-0.5">
            Powered by DTEK AI Technologies
          </p>
        </div>
      </div>
    </div>
  )
}