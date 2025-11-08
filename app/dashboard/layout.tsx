'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { DarkModeProvider } from '@/contexts/DarkModeContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Token kontrolü
    const token = localStorage.getItem('auth_token')
    
    if (!token) {
      // Token yoksa login'e yönlendir
      router.push('/login')
    }
  }, [router])

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        
        <div className="ml-64">
          <Header />
          
          <main className="p-6 w-full">
            <div className="max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DarkModeProvider>
  )
}
