import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * POST /api/webhooks/network-callback
 * 
 * Network'lerden status callback webhook:
 * - Network tarafından lead durumu güncelleme
 * - Conversion notification
 * - Rejection notification
 * - Payment status updates
 * 
 * Request Body:
 * {
 *   "network_id": number (required),
 *   "lead_id": number (optional),
 *   "external_lead_id": "string (optional)",
 *   "callback_type": "status_update|conversion|rejection|payment",
 *   "status": "new|contacted|qualified|converted|rejected (optional)",
 *   "amount": number (optional - for payments),
 *   "notes": "string (optional)",
 *   "metadata": object (optional)
 * }
 */

const networkCallbackSchema = z.object({
  network_id: z.number().min(1, 'Network ID required'),
  lead_id: z.number().optional(),
  external_lead_id: z.string().optional(),
  callback_type: z.enum(['status_update', 'conversion', 'rejection', 'payment']),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected']).optional(),
  amount: z.number().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const callbackData = networkCallbackSchema.parse(body);

    // 1. Verify network exists
    const networkResult = await db.query(
      `SELECT * FROM networks WHERE id = $1`,
      [callbackData.network_id]
    );

    if (networkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    const network = networkResult.rows[0];

    // 2. Find lead if provided
    let lead = null;
    if (callbackData.lead_id) {
      const leadResult = await db.query(
        `SELECT * FROM leads WHERE id = $1 AND network_id = $2`,
        [callbackData.lead_id, callbackData.network_id]
      );
      lead = leadResult.rows[0] || null;
    } else if (callbackData.external_lead_id) {
      const leadResult = await db.query(
        `SELECT l.* FROM leads l
         LEFT JOIN lead_activities la ON la.lead_id = l.id
         WHERE l.network_id = $1 AND la.metadata->>'external_id' = $2
         ORDER BY l.created_at DESC
         LIMIT 1`,
        [callbackData.network_id, callbackData.external_lead_id]
      );
      lead = leadResult.rows[0] || null;
    }

    // 3. Process callback based on type
    let activityDescription = '';
    let leadUpdated = false;

    switch (callbackData.callback_type) {
      case 'status_update':
        if (lead && callbackData.status) {
          await db.query(
            `UPDATE leads SET status = $1, last_contact_at = NOW()
             WHERE id = $2`,
            [callbackData.status, lead.id]
          );
          leadUpdated = true;
          activityDescription = `Network callback: Status güncellendi → ${callbackData.status}`;
        }
        break;

      case 'conversion':
        if (lead) {
          await db.query(
            `UPDATE leads SET status = 'converted', converted_at = NOW()
             WHERE id = $1`,
            [lead.id]
          );
          leadUpdated = true;
          activityDescription = `Network callback: Lead converted! Network: ${network.name}`;
        }
        break;

      case 'rejection':
        if (lead) {
          await db.query(
            `UPDATE leads SET status = 'rejected'
             WHERE id = $1`,
            [lead.id]
          );
          leadUpdated = true;
          activityDescription = `Network callback: Lead rejected. Reason: ${callbackData.notes || 'N/A'}`;
        }
        break;

      case 'payment':
        if (callbackData.amount && callbackData.amount > 0) {
          await db.query(
            `INSERT INTO network_payments 
            (network_id, amount, payment_date, notes, created_at)
            VALUES ($1, $2, NOW(), $3, NOW())`,
            [callbackData.network_id, callbackData.amount, callbackData.notes || 'Callback payment']
          );
          activityDescription = `Network callback: Payment received ${callbackData.amount} TL`;
        }
        break;
    }

    // 4. Log activity if lead exists
    if (lead) {
      await db.query(
        `INSERT INTO lead_activities 
        (lead_id, activity_type, description, metadata, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
        [
          lead.id,
          'network_callback',
          activityDescription,
          JSON.stringify({
            network_id: callbackData.network_id,
            network_name: network.name,
            callback_type: callbackData.callback_type,
            metadata: callbackData.metadata,
          }),
        ]
      );
    }

    // 5. Log webhook
    await db.query(
      `INSERT INTO webhook_logs 
      (webhook_type, source_system, payload, lead_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        'network-callback',
        `network_${callbackData.network_id}`,
        JSON.stringify(body),
        lead?.id || null,
        'success',
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Network callback processed successfully',
        data: {
          network_id: callbackData.network_id,
          network_name: network.name,
          callback_type: callbackData.callback_type,
          lead_id: lead?.id,
          lead_updated: leadUpdated,
          processed_at: new Date().toISOString(),
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Network callback error:', error);

    // Log failed webhook
    try {
      const body = await request.clone().json();
      await db.query(
        `INSERT INTO webhook_logs 
        (webhook_type, source_system, payload, status, error_message, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['network-callback', 'unknown', JSON.stringify(body), 'failed', error.message]
      );
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid callback payload', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process callback', message: error.message },
      { status: 500 }
    );
  }
}
