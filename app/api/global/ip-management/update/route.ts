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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ip, list_type, reputation_score, notes } = body

    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'IP address is required'
      }, { status: 400 })
    }

    // Check if IP exists
    const checkQuery = `SELECT id FROM global_ip_reputation WHERE ip = $1`
    const checkResult = await pool.query(checkQuery, [ip])

    let query: string
    let params: any[]

    if (checkResult.rows.length === 0) {
      // Insert new IP
      query = `
        INSERT INTO global_ip_reputation (
          ip, 
          list_type, 
          reputation_score, 
          notes,
          first_seen_at,
          last_seen_at,
          last_updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
        RETURNING *
      `
      params = [
        ip,
        list_type || 'unknown',
        reputation_score || 50,
        notes || null
      ]
    } else {
      // Update existing IP
      const updates: string[] = []
      params = [ip]
      let paramIndex = 2

      if (list_type !== undefined) {
        updates.push(`list_type = $${paramIndex}`)
        params.push(list_type)
        paramIndex++
      }

      if (reputation_score !== undefined) {
        updates.push(`reputation_score = $${paramIndex}`)
        params.push(reputation_score)
        paramIndex++
      }

      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex}`)
        params.push(notes)
        paramIndex++
      }

      updates.push(`last_updated_at = NOW()`)

      if (updates.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No fields to update'
        }, { status: 400 })
      }

      query = `
        UPDATE global_ip_reputation
        SET ${updates.join(', ')}
        WHERE ip = $1
        RETURNING *
      `
    }

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: checkResult.rows.length === 0 ? 'IP created successfully' : 'IP updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating IP:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// Bulk update IPs
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { ips, list_type, reputation_score } = body

    if (!ips || !Array.isArray(ips) || ips.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'IP array is required'
      }, { status: 400 })
    }

    if (!list_type && reputation_score === undefined) {
      return NextResponse.json({
        success: false,
        error: 'At least one field to update is required'
      }, { status: 400 })
    }

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (list_type) {
      updates.push(`list_type = $${paramIndex}`)
      params.push(list_type)
      paramIndex++
    }

    if (reputation_score !== undefined) {
      updates.push(`reputation_score = $${paramIndex}`)
      params.push(reputation_score)
      paramIndex++
    }

    updates.push(`last_updated_at = NOW()`)

    // Add IPs to params
    params.push(ips)

    const query = `
      UPDATE global_ip_reputation
      SET ${updates.join(', ')}
      WHERE ip = ANY($${paramIndex})
      RETURNING ip, list_type, reputation_score
    `

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      data: {
        updated_count: result.rows.length,
        updated_ips: result.rows
      },
      message: `${result.rows.length} IPs updated successfully`
    })

  } catch (error: any) {
    console.error('Error bulk updating IPs:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
