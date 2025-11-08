'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Token kontrolü
    const token = localStorage.getItem('auth_token')
    
    if (token) {
      // Token varsa dashboard'a yönlendir
      router.push('/dashboard/traffic/overview')
    } else {
      // Token yoksa login'e yönlendir
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
