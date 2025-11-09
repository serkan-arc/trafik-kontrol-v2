import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

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

    switch (action) {
      case 'approve':
        newStatus = 'approved_for_crm'
        updateField = 'approved_at = NOW()'
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
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Convert leadIds to SQL array format
    const leadIdsArray = leadIds.map(id => parseInt(id)).filter(id => !isNaN(id))

    if (leadIdsArray.length === 0) {
      return NextResponse.json(
        { error: 'No valid lead IDs provided' },
        { status: 400 }
      )
    }

    // Update leads status
    const updateQuery = updateField
      ? `UPDATE n8n_leads 
         SET status = '${newStatus}', 
             ${updateField},
             updated_at = NOW()
         WHERE id = ANY($1::int[])`
      : `UPDATE n8n_leads 
         SET status = '${newStatus}', 
             updated_at = NOW()
         WHERE id = ANY($1::int[])`

    await sql.query(updateQuery, [leadIdsArray])

    return NextResponse.json({
      success: true,
      message: `${leadIdsArray.length} lead güncellendi`,
      action,
      updatedCount: leadIdsArray.length
    })

  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json(
      { error: 'İşlem sırasında bir hata oluştu', details: String(error) },
      { status: 500 }
    )
  }
}
