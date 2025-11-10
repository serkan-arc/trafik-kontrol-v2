'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/layout/DashboardHeader'
import DashboardNav from '@/components/layout/DashboardNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('partner_token')
    
    if (!token) {
      router.push('/')
      return
    }

    // Verify token with API
    fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('partner_token')
          localStorage.removeItem('partner_info')
          router.push('/')
        }
      })
      .catch(() => {
        router.push('/')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      <DashboardNav />
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
