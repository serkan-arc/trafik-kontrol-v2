import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET - Get package details with items
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batch_id } = await params

    // Get batch details
    const batchResult = await query(`
      SELECT 
        lb.id, lb.batch_id, lb.batch_name,
        lb.buyer_code, b.buyer_name, b.company_name,
        lb.offer_id, o.offer_name, o.base_price,
        lb.lead_count, lb.approved_count, lb.rejected_count,
        lb.status, lb.created_by, lb.sent_by, lb.completed_by,
        lb.created_at, lb.sent_at, lb.completed_at,
        lb.export_format, lb.export_path, lb.export_url,
        lb.crm_batch_id, lb.crm_status, lb.crm_response,
        lb.notes, lb.metadata
      FROM lead_batches lb
      LEFT JOIN buyers b ON lb.buyer_code = b.buyer_code
      LEFT JOIN offers o ON lb.offer_id = o.offer_id
      WHERE lb.batch_id = $1
    `, [batch_id])

    if (batchResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      )
    }

    const batch = batchResult.rows[0]

    // Get batch items
    const itemsResult = await query(`
      SELECT 
        id, tracking_id, buyer_code, offer_id,
        customer_name, customer_phone, customer_email,
        customer_address, customer_country,
        status, processed_at, rejection_reason,
        crm_lead_id, crm_sync_status, crm_sync_at,
        added_at
      FROM lead_batch_items
      WHERE batch_id = $1
      ORDER BY added_at DESC
    `, [batch_id])

    const items = itemsResult.rows

    return NextResponse.json({
      success: true,
      batch,
      items,
      item_count: items.length
    })

  } catch (error: any) {
    console.error('GET /api/packages/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update package status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batch_id } = await params
    const body = await request.json()
    const { status, sent_by, completed_by, export_url, crm_batch_id, crm_status, notes } = body

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (status) {
      updates.push(`status = $${paramCount}`)
      values.push(status)
      paramCount++

      if (status === 'sent') {
        updates.push(`sent_at = NOW()`)
        if (sent_by) {
          updates.push(`sent_by = $${paramCount}`)
          values.push(sent_by)
          paramCount++
        }
      }

      if (status === 'completed') {
        updates.push(`completed_at = NOW()`)
        if (completed_by) {
          updates.push(`completed_by = $${paramCount}`)
          values.push(completed_by)
          paramCount++
        }
      }
    }

    if (export_url) {
      updates.push(`export_url = $${paramCount}`)
      values.push(export_url)
      paramCount++
    }

    if (crm_batch_id) {
      updates.push(`crm_batch_id = $${paramCount}`)
      values.push(crm_batch_id)
      paramCount++
    }

    if (crm_status) {
      updates.push(`crm_status = $${paramCount}`)
      values.push(crm_status)
      paramCount++
    }

    if (notes) {
      updates.push(`notes = $${paramCount}`)
      values.push(notes)
      paramCount++
    }

    updates.push('updated_at = NOW()')

    values.push(batch_id)

    const result = await query(`
      UPDATE lead_batches
      SET ${updates.join(', ')}
      WHERE batch_id = $${paramCount}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      batch: result.rows[0]
    })

  } catch (error: any) {
    console.error('PATCH /api/packages/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete package
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batch_id } = await params

    // Update leads status back to approved_for_crm
    await query(`
      UPDATE n8n_leads
      SET status = 'approved_for_crm',
          batch_id = NULL,
          updated_at = NOW()
      WHERE batch_id = $1
    `, [batch_id])

    // Delete batch (items will be cascade deleted)
    await query('DELETE FROM lead_batches WHERE batch_id = $1', [batch_id])

    return NextResponse.json({
      success: true,
      message: 'Package deleted successfully'
    })

  } catch (error: any) {
    console.error('DELETE /api/packages/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
