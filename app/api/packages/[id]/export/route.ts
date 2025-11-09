import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET - Export package to Excel/CSV
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batch_id } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'excel'

    // Get batch details
    const batchResult = await query(`
      SELECT lb.*, b.buyer_name, o.offer_name
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
        tracking_id, customer_name, customer_phone, customer_email,
        customer_address, customer_country, status, added_at
      FROM lead_batch_items
      WHERE batch_id = $1
      AND status IN ('pending', 'approved')
      ORDER BY added_at ASC
    `, [batch_id])

    const items = itemsResult.rows

    if (format === 'csv') {
      // CSV format
      const headers = [
        'Tracking ID',
        'Customer Name',
        'Phone',
        'Email',
        'Address',
        'Country',
        'Status',
        'Added Date'
      ]

      const csvRows = [
        headers.join(','),
        ...items.map(item => [
          item.tracking_id,
          `"${item.customer_name || ''}"`,
          item.customer_phone || '',
          item.customer_email || '',
          `"${(item.customer_address || '').replace(/"/g, '""')}"`,
          item.customer_country || '',
          item.status,
          new Date(item.added_at).toISOString().split('T')[0]
        ].join(','))
      ]

      const csvContent = csvRows.join('\n')
      const filename = `${batch_id}_${Date.now()}.csv`

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    } else if (format === 'json') {
      // JSON format
      const jsonData = {
        batch: {
          batch_id: batch.batch_id,
          batch_name: batch.batch_name,
          buyer_code: batch.buyer_code,
          buyer_name: batch.buyer_name,
          offer_id: batch.offer_id,
          offer_name: batch.offer_name,
          created_at: batch.created_at,
          lead_count: items.length
        },
        leads: items.map(item => ({
          tracking_id: item.tracking_id,
          customer: {
            name: item.customer_name,
            phone: item.customer_phone,
            email: item.customer_email,
            address: item.customer_address,
            country: item.customer_country
          },
          status: item.status,
          added_at: item.added_at
        }))
      }

      const filename = `${batch_id}_${Date.now()}.json`

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    } else {
      // Excel format - return data for client-side excel generation
      return NextResponse.json({
        success: true,
        batch: {
          batch_id: batch.batch_id,
          batch_name: batch.batch_name,
          buyer_name: batch.buyer_name,
          offer_name: batch.offer_name,
          created_at: batch.created_at
        },
        leads: items,
        count: items.length
      })
    }

  } catch (error: any) {
    console.error('GET /api/packages/[id]/export error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
