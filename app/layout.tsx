import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Traffic Control System - Advanced Traffic Management',
  description: 'Advanced traffic control system with IP tracking, bot detection, spam prevention, and analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="notranslate">{children}</body>
    </html>
  )
}
