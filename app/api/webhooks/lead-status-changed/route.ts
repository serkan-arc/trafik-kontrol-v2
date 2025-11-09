import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { processLeadCommission } from '@/lib/commission-calculator'

/**
 * Webhook handler for lead status changes
 * Automatically calculates commission when lead status changes
 * 
 * Called by:
 * - Internal bulk action API
 * - CRM status updates
 * - Manual status changes
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tracking_id, old_status, new_status, sale_amount } = body

    if (!tracking_id || !new_status) {
      return NextResponse.json(
        { success: false, error: 'tracking_id and new_status are required' },
        { status: 400 }
      )
    }

    console.log(`Lead status changed: ${tracking_id} from ${old_status} to ${new_status}`)

    // Fetch lead details
    const leadResult = await query(`
      SELECT 
        id, tracking_id, buyer_code, offer_id, status,
        crm_order_id, commission_amount as sale_amount, created_at
      FROM n8n_leads
      WHERE tracking_id = $1
    `, [tracking_id])

    if (leadResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      )
    }

    const lead = leadResult.rows[0] as any

    // Update sale_amount if provided
    if (sale_amount && sale_amount > 0) {
      await query(`
        UPDATE n8n_leads
        SET commission_amount = $1, updated_at = NOW()
        WHERE tracking_id = $2
      `, [sale_amount, tracking_id])
      
      lead.sale_amount = sale_amount
    }

    // Process commission calculation
    const processed = await processLeadCommission(lead)

    if (processed) {
      return NextResponse.json({
        success: true,
        commission_calculated: true,
        tracking_id,
        status: new_status,
        message: 'Commission calculated and saved successfully'
      })
    } else {
      return NextResponse.json({
        success: true,
        commission_calculated: false,
        tracking_id,
        status: new_status,
        message: 'No commission calculated (status not eligible or already exists)'
      })
    }

  } catch (error: any) {
    console.error('POST /api/webhooks/lead-status-changed error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
