import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { bulkProcessCommissions } from '@/lib/commission-calculator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, leadIds } = body

    if (!action || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Action and leadIds are required.' },
        { status: 400 }
      )
    }

    let newStatus: string
    let updateField = ''
    let calculateCommission = false

    switch (action) {
      case 'approve':
        newStatus = 'approved_for_crm'
        updateField = 'approved_at = NOW()'
        calculateCommission = true // Calculate CPL commissions
        break
      case 'hold':
        newStatus = 'on_hold'
        break
      case 'reject':
        newStatus = 'rejected'
        break
      case 'package':
        // Package action - we'll handle this differently later
        // For now, just mark as approved
        newStatus = 'approved_for_crm'
        updateField = 'approved_at = NOW()'
        calculateCommission = true
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Convert leadIds to SQL array format
    const leadIdsArray = leadIds.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))

    if (leadIdsArray.length === 0) {
      return NextResponse.json(
        { error: 'No valid lead IDs provided' },
        { status: 400 }
      )
    }

    // Update leads status
    const updateQuery = updateField
      ? `UPDATE n8n_leads 
         SET status = $1, 
             ${updateField},
             updated_at = NOW()
         WHERE id = ANY($2::int[])`
      : `UPDATE n8n_leads 
         SET status = $1, 
             updated_at = NOW()
         WHERE id = ANY($2::int[])`

    await query(updateQuery, [newStatus, leadIdsArray])

    // Calculate commissions if applicable
    let commissionResult = null
    if (calculateCommission) {
      try {
        commissionResult = await bulkProcessCommissions(leadIdsArray)
        console.log(`Commission calculation: ${commissionResult.success} success, ${commissionResult.failed} failed`)
      } catch (error) {
        console.error('Commission calculation error:', error)
        // Don't fail the entire request if commission calculation fails
      }
    }

    const response: any = {
      success: true,
      message: `${leadIdsArray.length} lead güncellendi`,
      action,
      updatedCount: leadIdsArray.length
    }

    if (commissionResult) {
      response.commissions = {
        calculated: commissionResult.success,
        failed: commissionResult.failed
      }
      response.message += ` | ${commissionResult.success} komisyon hesaplandı`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json(
      { error: 'İşlem sırasında bir hata oluştu', details: String(error) },
      { status: 500 }
    )
  }
}
