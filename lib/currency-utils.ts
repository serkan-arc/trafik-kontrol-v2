/**
 * Currency utility functions for multi-currency support
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  TRY: '₺',
  GBP: '£',
}

export const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  TRY: 'Turkish Lira',
  GBP: 'British Pound',
}

/**
 * Get currency symbol for a currency code
 * @param currencyCode - ISO currency code (EUR, USD, TRY, etc.)
 * @returns Currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode
}

/**
 * Format amount with currency
 * @param amount - Numeric amount
 * @param currencyCode - ISO currency code
 * @returns Formatted string like "$50.00" or "€45.50"
 */
export function formatCurrency(amount: number | string, currencyCode: string = 'EUR'): string {
  const numAmount = typeof amount === 'string' ? Number(amount) : amount
  const symbol = getCurrencySymbol(currencyCode)
  return `${symbol}${numAmount.toFixed(2)}`
}

/**
 * Group amounts by currency and return formatted totals
 * @param items - Array of items with amount and currency
 * @param amountKey - Key name for amount field
 * @param currencyKey - Key name for currency field
 * @returns Object with totals per currency
 */
export function groupByCurrency<T extends Record<string, any>>(
  items: T[],
  amountKey: keyof T = 'commission_amount',
  currencyKey: keyof T = 'currency'
): Record<string, number> {
  const totals: Record<string, number> = {}

  items.forEach(item => {
    const currency = String(item[currencyKey] || 'EUR')
    const amount = Number(item[amountKey] || 0)
    
    if (!totals[currency]) {
      totals[currency] = 0
    }
    totals[currency] += amount
  })

  return totals
}

/**
 * Format grouped currency totals for display
 * @param totals - Object with currency totals
 * @returns Formatted string like "€1,250.00 + $300.00"
 */
export function formatCurrencyTotals(totals: Record<string, number>): string {
  const formatted = Object.entries(totals)
    .filter(([_, amount]) => amount > 0)
    .map(([currency, amount]) => formatCurrency(amount, currency))
  
  return formatted.join(' + ') || formatCurrency(0, 'EUR')
}

/**
 * Get dominant currency from items (most frequently used)
 * @param items - Array of items with currency field
 * @param currencyKey - Key name for currency field
 * @returns Most common currency code
 */
export function getDominantCurrency<T extends Record<string, any>>(
  items: T[],
  currencyKey: keyof T = 'currency'
): string {
  if (items.length === 0) return 'EUR'

  const counts: Record<string, number> = {}
  
  items.forEach(item => {
    const currency = String(item[currencyKey] || 'EUR')
    counts[currency] = (counts[currency] || 0) + 1
  })

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'EUR'
}
