'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface DarkModeContextType {
  darkMode: boolean
  toggleDarkMode: () => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with false to match server-side render
  const [darkMode, setDarkMode] = useState(false)

  // Load dark mode preference on mount (client-side only)
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
    
    // Apply immediately on mount
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Apply dark mode class whenever it changes after initial mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    console.log('🔄 Toggle clicked! Current:', darkMode, 'New:', !darkMode)
    setDarkMode(prev => {
      console.log('🔄 Setting darkMode from', prev, 'to', !prev)
      return !prev
    })
  }

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider')
  }
  return context
}
