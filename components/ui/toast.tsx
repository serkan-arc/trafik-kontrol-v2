import { useEffect, useState } from 'react'

interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

let toastListener: ((toast: ToastMessage) => void) | null = null

export const toast = {
  success: (message: string) => {
    const toastMessage: ToastMessage = {
      id: Date.now().toString(),
      message,
      type: 'success'
    }
    if (toastListener) {
      toastListener(toastMessage)
    }
  },
  error: (message: string) => {
    const toastMessage: ToastMessage = {
      id: Date.now().toString(),
      message,
      type: 'error'
    }
    if (toastListener) {
      toastListener(toastMessage)
    }
  },
  info: (message: string) => {
    const toastMessage: ToastMessage = {
      id: Date.now().toString(),
      message,
      type: 'info'
    }
    if (toastListener) {
      toastListener(toastMessage)
    }
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    toastListener = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 3000)
    }
    
    return () => {
      toastListener = null
    }
  }, [])

  if (toasts.length === 0) return null

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-md shadow-lg transition-all duration-300 ${typeStyles[toast.type]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}