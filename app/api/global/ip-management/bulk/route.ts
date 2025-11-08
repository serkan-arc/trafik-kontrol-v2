import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'traffic_control',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
})

// POST: Bulk operations on IPs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, ips, params } = body

    if (!operation || !ips || !Array.isArray(ips) || ips.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Operation and IPs array are required'
      }, { status: 400 })
    }

    const client = await pool.connect()
    let results: any = { success: 0, failed: 0, errors: [] }

    try {
      await client.query('BEGIN')

      switch (operation) {
        case 'whitelist':
        case 'graylist':
        case 'blacklist':
          // Update list_type for multiple IPs
          for (const ip of ips) {
            try {
              await client.query(`
                INSERT INTO global_ip_reputation (ip, list_type, reputation_score)
                VALUES ($1, $2, $3)
                ON CONFLICT (ip) 
                DO UPDATE SET 
                  list_type = $2,
                  reputation_score = CASE 
                    WHEN $2 = 'whitelist' THEN 0
                    WHEN $2 = 'blacklist' THEN 100
                    ELSE 50
                  END,
                  last_updated_at = NOW()
              `, [
                ip, 
                operation,
                operation === 'whitelist' ? 0 : operation === 'blacklist' ? 100 : 50
              ])
              results.success++
            } catch (error: any) {
              results.failed++
              results.errors.push({ ip, error: error.message })
            }
          }
          break

        case 'ban':
          // Ban multiple IPs
          const { ban_type, ban_expires_at, ban_reason } = params || {}
          
          for (const ip of ips) {
            try {
              await client.query(`
                INSERT INTO global_ip_reputation (
                  ip, is_banned, ban_type, ban_expires_at, ban_reason, banned_at, banned_by
                )
                VALUES ($1, true, $2, $3, $4, NOW(), 'bulk_operation')
                ON CONFLICT (ip) 
                DO UPDATE SET 
                  is_banned = true,
                  ban_type = $2,
                  ban_expires_at = $3,
                  ban_reason = $4,
                  banned_at = NOW(),
                  banned_by = 'bulk_operation',
                  last_updated_at = NOW()
              `, [ip, ban_type || 'permanent', ban_expires_at || null, ban_reason || 'Bulk ban operation'])
              results.success++
            } catch (error: any) {
              results.failed++
              results.errors.push({ ip, error: error.message })
            }
          }
          break

        case 'unban':
          // Unban multiple IPs
          for (const ip of ips) {
            try {
              await client.query(`
                UPDATE global_ip_reputation
                SET 
                  is_banned = false,
                  ban_type = NULL,
                  ban_expires_at = NULL,
                  ban_reason = NULL,
                  last_updated_at = NOW()
                WHERE ip = $1
              `, [ip])
              results.success++
            } catch (error: any) {
              results.failed++
              results.errors.push({ ip, error: error.message })
            }
          }
          break

        case 'delete':
          // Delete multiple IPs
          for (const ip of ips) {
            try {
              await client.query('DELETE FROM global_ip_reputation WHERE ip = $1', [ip])
              results.success++
            } catch (error: any) {
              results.failed++
              results.errors.push({ ip, error: error.message })
            }
          }
          break

        default:
          await client.query('ROLLBACK')
          return NextResponse.json({
            success: false,
            error: `Unknown operation: ${operation}`
          }, { status: 400 })
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        operation,
        results,
        message: `Bulk operation completed: ${results.success} succeeded, ${results.failed} failed`
      })

    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Error in bulk operation:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
