import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { query } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d' // Token expires in 7 days

export interface PartnerPayload {
  buyer_code: string
  buyer_name: string
  email: string
}

export interface JWTPayload extends PartnerPayload {
  iat: number
  exp: number
}

/**
 * Authenticate partner with username and password
 */
export async function authenticatePartner(
  username: string,
  password: string
): Promise<{ success: boolean; partner?: PartnerPayload; token?: string; error?: string }> {
  try {
    // Find partner by username
    const result = await query(
      `SELECT 
        buyer_code, 
        buyer_name, 
        email, 
        dashboard_password,
        status,
        portal_active
      FROM buyers 
      WHERE dashboard_username = $1`,
      [username]
    )

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid credentials' }
    }

    const partner = result.rows[0]

    // Check if partner is active
    if (partner.status !== 'active') {
      return { success: false, error: 'Account is not active' }
    }

    // Check if portal access is enabled
    if (!partner.portal_active) {
      return { success: false, error: 'Portal access is disabled' }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, partner.dashboard_password)
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Update last login
    await query(
      'UPDATE buyers SET portal_last_login = NOW() WHERE buyer_code = $1',
      [partner.buyer_code]
    )

    // Create JWT token
    const payload: PartnerPayload = {
      buyer_code: partner.buyer_code,
      buyer_name: partner.buyer_name,
      email: partner.email
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    return {
      success: true,
      partner: payload,
      token
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

/**
 * Verify JWT token and return partner info
 */
export async function verifyToken(token: string): Promise<{ success: boolean; partner?: PartnerPayload; error?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    
    // Check if partner still exists and is active
    const result = await query(
      'SELECT buyer_code, buyer_name, email, status, portal_active FROM buyers WHERE buyer_code = $1',
      [decoded.buyer_code]
    )

    if (result.rows.length === 0) {
      return { success: false, error: 'Partner not found' }
    }

    const partner = result.rows[0]

    if (partner.status !== 'active' || !partner.portal_active) {
      return { success: false, error: 'Portal access is disabled' }
    }

    return {
      success: true,
      partner: {
        buyer_code: partner.buyer_code,
        buyer_name: partner.buyer_name,
        email: partner.email
      }
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, error: 'Token expired' }
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, error: 'Invalid token' }
    }
    console.error('Token verification error:', error)
    return { success: false, error: 'Token verification failed' }
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

/**
 * Hash password (for admin to create partner credentials)
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}
