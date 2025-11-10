'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { en, Translations } from './locales/en'
import { tr } from './locales/tr'

export type Locale = 'en' | 'tr'

const translations: Record<Locale, Translations> = {
  en,
  tr
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  // Get initial locale from localStorage or default to 'en'
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    // Load locale from localStorage on mount
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'tr')) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const t = translations[locale]

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Helper hook for simple translations
export function useTranslation() {
  const { t } = useI18n()
  return t
}
