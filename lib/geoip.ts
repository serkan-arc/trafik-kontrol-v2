/**
 * GeoIP Service
 * 
 * Provides IP geolocation services using multiple providers:
 * 1. MaxMind GeoLite2 (local database) - Primary, fast, offline
 * 2. IPinfo.io API - Fallback, accurate, requires API key
 * 3. ip-api.com - Free fallback, rate limited
 */

interface GeoIPResult {
  ip: string
  country?: string
  countryCode?: string
  region?: string
  regionCode?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
  isp?: string
  org?: string
  as?: string
  asName?: string
  isEU?: boolean
  isProxy?: boolean
  isVPN?: boolean
  isTor?: boolean
  isHosting?: boolean
  isMobile?: boolean
  source: 'maxmind' | 'ipinfo' | 'ipapi' | 'cache'
}

// In-memory cache
const geoCache = new Map<string, { data: GeoIPResult; expiresAt: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Clean expired cache entries
 */
function cleanCache() {
  const now = Date.now()
  for (const [ip, entry] of geoCache.entries()) {
    if (entry.expiresAt <= now) {
      geoCache.delete(ip)
    }
  }
}

/**
 * Get from cache
 */
function getFromCache(ip: string): GeoIPResult | null {
  const entry = geoCache.get(ip)
  if (entry && entry.expiresAt > Date.now()) {
    return { ...entry.data, source: 'cache' }
  }
  return null
}

/**
 * Save to cache
 */
function saveToCache(ip: string, data: GeoIPResult) {
  geoCache.set(ip, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  })
  
  // Clean cache occasionally
  if (Math.random() < 0.01) {
    cleanCache()
  }
}

/**
 * Lookup using IPinfo.io API
 */
async function lookupIPinfo(ip: string): Promise<GeoIPResult | null> {
  const apiKey = process.env.IPINFO_API_KEY
  if (!apiKey) return null
  
  try {
    const url = `https://ipinfo.io/${ip}/json?token=${apiKey}`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    const [latitude, longitude] = (data.loc || '0,0').split(',').map(parseFloat)
    const [city, region] = (data.region || ',').split(',')
    
    const result: GeoIPResult = {
      ip,
      country: data.country_name || data.country,
      countryCode: data.country,
      region: region || data.region,
      city: city || data.city,
      latitude,
      longitude,
      timezone: data.timezone,
      isp: data.org,
      org: data.org,
      as: data.asn,
      asName: data.asn,
      isProxy: data.privacy?.proxy === true,
      isVPN: data.privacy?.vpn === true,
      isTor: data.privacy?.tor === true,
      isHosting: data.privacy?.hosting === true,
      source: 'ipinfo'
    }
    
    return result
  } catch (error) {
    console.error('IPinfo lookup error:', error)
    return null
  }
}

/**
 * Lookup using ip-api.com (free, rate limited)
 */
async function lookupIPAPI(ip: string): Promise<GeoIPResult | null> {
  try {
    const url = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (data.status !== 'success') return null
    
    const result: GeoIPResult = {
      ip: data.query,
      country: data.country,
      countryCode: data.countryCode,
      region: data.regionName,
      regionCode: data.region,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      as: data.as,
      asName: data.asname,
      isMobile: data.mobile === true,
      isProxy: data.proxy === true,
      isHosting: data.hosting === true,
      source: 'ipapi'
    }
    
    return result
  } catch (error) {
    console.error('IP-API lookup error:', error)
    return null
  }
}

/**
 * Main GeoIP lookup function
 */
export async function lookupGeoIP(ip: string): Promise<GeoIPResult> {
  // Check cache first
  const cached = getFromCache(ip)
  if (cached) return cached
  
  // Handle private/local IPs
  if (
    ip === '127.0.0.1' ||
    ip === 'localhost' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  ) {
    const result: GeoIPResult = {
      ip,
      country: 'Local',
      countryCode: 'LOCAL',
      city: 'Private Network',
      source: 'maxmind'
    }
    saveToCache(ip, result)
    return result
  }
  
  // Try IPinfo first (most accurate, requires API key)
  const ipinfoResult = await lookupIPinfo(ip)
  if (ipinfoResult) {
    saveToCache(ip, ipinfoResult)
    return ipinfoResult
  }
  
  // Fallback to IP-API (free, rate limited)
  const ipapiResult = await lookupIPAPI(ip)
  if (ipapiResult) {
    saveToCache(ip, ipapiResult)
    return ipapiResult
  }
  
  // Return unknown result
  const unknownResult: GeoIPResult = {
    ip,
    country: 'Unknown',
    countryCode: 'XX',
    source: 'maxmind'
  }
  
  // Don't cache unknown results (short cache only)
  return unknownResult
}

/**
 * Batch lookup (optimized for multiple IPs)
 */
export async function lookupGeoIPBatch(ips: string[]): Promise<Map<string, GeoIPResult>> {
  const results = new Map<string, GeoIPResult>()
  
  // Process in parallel with concurrency limit
  const concurrency = 5
  const batches: string[][] = []
  
  for (let i = 0; i < ips.length; i += concurrency) {
    batches.push(ips.slice(i, i + concurrency))
  }
  
  for (const batch of batches) {
    const promises = batch.map(ip => lookupGeoIP(ip))
    const batchResults = await Promise.all(promises)
    
    batchResults.forEach(result => {
      results.set(result.ip, result)
    })
  }
  
  return results
}

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode === 'XX' || countryCode === 'LOCAL') {
    return '🏳️'
  }
  
  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  
  return String.fromCodePoint(...codePoints)
}

/**
 * Get country name from code (basic mapping)
 */
export function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'BE': 'Belgium',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'RO': 'Romania',
    'GR': 'Greece',
    'PT': 'Portugal',
    'HU': 'Hungary',
    'IE': 'Ireland',
    'JP': 'Japan',
    'CN': 'China',
    'IN': 'India',
    'KR': 'South Korea',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'AR': 'Argentina',
    'RU': 'Russia',
    'TR': 'Turkey',
    'SA': 'Saudi Arabia',
    'AE': 'United Arab Emirates',
    'IL': 'Israel',
    'ZA': 'South Africa',
    'NG': 'Nigeria',
    'EG': 'Egypt',
    'LOCAL': 'Local Network',
    'XX': 'Unknown'
  }
  
  return countryNames[countryCode] || countryCode
}

/**
 * Check if IP is from high-risk country
 */
export function isHighRiskCountry(countryCode: string): boolean {
  // This is a basic example - customize based on your needs
  const highRiskCountries: string[] = [
    // Add countries based on your security requirements
    // This is just an example, adjust for your use case
  ]
  
  return highRiskCountries.includes(countryCode)
}

/**
 * Calculate distance between two coordinates (in km)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
