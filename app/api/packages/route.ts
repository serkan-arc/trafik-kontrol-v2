import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET - List all packages with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const buyer_code = searchParams.get('buyer_code')
    const offer_id = searchParams.get('offer_id')
    const from_date = searchParams.get('from_date')
    const to_date = searchParams.get('to_date')

    let queryText = `
      SELECT 
        lb.id, lb.batch_id, lb.batch_name,
        lb.buyer_code, b.buyer_name,
        lb.offer_id, o.offer_name,
        lb.lead_count, lb.approved_count, lb.rejected_count,
        lb.status, lb.created_by, lb.sent_by,
        lb.created_at, lb.sent_at, lb.completed_at,
        lb.export_format, lb.export_url,
        lb.crm_batch_id, lb.crm_status, lb.notes
      FROM lead_batches lb
      LEFT JOIN buyers b ON lb.buyer_code = b.buyer_code
      LEFT JOIN offers o ON lb.offer_id = o.offer_id
      WHERE 1=1
    `

    const params: any[] = []
    let paramCount = 1

    if (status && status !== 'all') {
      queryText += ` AND lb.status = $${paramCount}`
      params.push(status)
      paramCount++
    }

    if (buyer_code) {
      queryText += ` AND lb.buyer_code = $${paramCount}`
      params.push(buyer_code)
      paramCount++
    }

    if (offer_id) {
      queryText += ` AND lb.offer_id = $${paramCount}`
      params.push(offer_id)
      paramCount++
    }

    if (from_date) {
      queryText += ` AND lb.created_at >= $${paramCount}`
      params.push(from_date)
      paramCount++
    }

    if (to_date) {
      queryText += ` AND lb.created_at <= $${paramCount}`
      params.push(to_date + ' 23:59:59')
      paramCount++
    }

    queryText += ' ORDER BY lb.created_at DESC'

    const result = await query(queryText, params)
    const packages = result.rows

    return NextResponse.json({ 
      success: true, 
      packages,
      count: packages.length 
    })

  } catch (error: any) {
    console.error('GET /api/packages error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new package
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      batch_name, 
      buyer_code, 
      offer_id, 
      lead_ids,
      created_by = 'admin'
    } = body

    if (!batch_name || !buyer_code || !offer_id || !lead_ids || lead_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'batch_name, buyer_code, offer_id, and lead_ids are required' },
        { status: 400 }
      )
    }

    // Generate batch_id
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '_')
    const timeStr = date.getTime().toString().slice(-4)
    const batch_id = `BATCH_${dateStr}_${timeStr}`

    // Create batch
    const batchResult = await query(`
      INSERT INTO lead_batches (
        batch_id, batch_name, buyer_code, offer_id,
        status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [batch_id, batch_name, buyer_code, offer_id, 'draft', created_by])

    const batch = batchResult.rows[0]

    // Fetch leads data
    const leadsResult = await query(`
      SELECT 
        tracking_id, buyer_code, offer_id,
        customer_name, customer_phone, customer_email,
        customer_address, customer_country, lead_data
      FROM n8n_leads
      WHERE tracking_id = ANY($1::text[])
      AND buyer_code = $2
      AND offer_id = $3
      AND status = 'approved_for_crm'
    `, [lead_ids, buyer_code, offer_id])

    // Add leads to batch
    if (leadsResult.rows.length > 0) {
      const itemsValues = leadsResult.rows.map((lead, idx) => {
        const offset = idx * 10
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      }).join(', ')

      const itemsParams: any[] = []
      leadsResult.rows.forEach(lead => {
        itemsParams.push(
          batch_id,
          lead.tracking_id,
          lead.buyer_code,
          lead.offer_id,
          lead.customer_name,
          lead.customer_phone,
          lead.customer_email,
          lead.customer_address,
          lead.customer_country,
          lead.lead_data
        )
      })

      await query(`
        INSERT INTO lead_batch_items (
          batch_id, tracking_id, buyer_code, offer_id,
          customer_name, customer_phone, customer_email,
          customer_address, customer_country, lead_data, status
        ) VALUES ${itemsValues}
      `, itemsParams)

      // Update leads status
      await query(`
        UPDATE n8n_leads
        SET status = 'in_package',
            batch_id = $1,
            updated_at = NOW()
        WHERE tracking_id = ANY($2::text[])
      `, [batch_id, lead_ids])
    }

    return NextResponse.json({ 
      success: true, 
      batch,
      batch_id,
      added_count: leadsResult.rows.length
    })

  } catch (error: any) {
    console.error('POST /api/packages error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
