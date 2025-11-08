'use client'

import { useEffect, useState } from 'react'

export default function TestDarkModePage() {
  const [darkModeValue, setDarkModeValue] = useState<string | null>(null)
  const [htmlClasses, setHtmlClasses] = useState<string>('')

  useEffect(() => {
    // Check localStorage
    const value = localStorage.getItem('darkMode')
    setDarkModeValue(value)
    
    // Check HTML classes
    setHtmlClasses(document.documentElement.classList.toString())
  }, [])

  const clearDarkMode = () => {
    localStorage.removeItem('darkMode')
    document.documentElement.classList.remove('dark')
    setDarkModeValue(null)
    setHtmlClasses(document.documentElement.classList.toString())
    alert('Dark mode cleared! Page will reload.')
    window.location.reload()
  }

  const enableDarkMode = () => {
    localStorage.setItem('darkMode', 'true')
    document.documentElement.classList.add('dark')
    setDarkModeValue('true')
    setHtmlClasses(document.documentElement.classList.toString())
  }

  const disableDarkMode = () => {
    localStorage.setItem('darkMode', 'false')
    document.documentElement.classList.remove('dark')
    setDarkModeValue('false')
    setHtmlClasses(document.documentElement.classList.toString())
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Dark Mode Debug Tool
        </h1>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Current Status
          </h2>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">localStorage['darkMode']:</span>
              <span className="font-mono text-gray-900">
                {darkModeValue === null ? 'null' : `"${darkModeValue}"`}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">HTML classes:</span>
              <span className="font-mono text-gray-900">
                {htmlClasses || '(empty)'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Actions
          </h2>
          
          <div className="flex gap-4">
            <button
              onClick={enableDarkMode}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Enable Dark Mode
            </button>
            
            <button
              onClick={disableDarkMode}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
            >
              Disable Dark Mode
            </button>
            
            <button
              onClick={clearDarkMode}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Clear & Reset
            </button>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Instructions:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use "Clear & Reset" if dark mode is stuck</li>
            <li>• Check console for any errors</li>
            <li>• After clearing, go to Settings and toggle again</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
