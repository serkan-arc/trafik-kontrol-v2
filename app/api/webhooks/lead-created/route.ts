import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * POST /api/webhooks/lead-created
 * 
 * External sistemlerden lead kabul etme webhook:
 * - Network'lerden, formlardan, entegrasyonlardan lead alma
 * - Otomatik lead oluşturma ve kaydetme
 * - Duplicate checking (phone/email)
 * - Activity logging
 * - Optional webhook signature verification
 * - Source attribution (network, site, campaign)
 * 
 * Request Body:
 * {
 *   "name": "string (required)",
 *   "phone": "string (required)",
 *   "email": "string (optional)",
 *   "network_id": number (optional),
 *   "site_id": number (optional),
 *   "campaign_id": number (optional),
 *   "utm_source": "string (optional)",
 *   "utm_medium": "string (optional)",
 *   "utm_campaign": "string (optional)",
 *   "custom_fields": object (optional),
 *   "source_system": "string (optional)",
 *   "external_id": "string (optional)",
 *   "webhook_signature": "string (optional for verification)"
 * }
 * 
 * Headers:
 * - X-Webhook-Signature: HMAC signature for verification (optional)
 * - X-Source-System: Source system identifier
 */

const leadWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Invalid email').optional().nullable(),
  network_id: z.number().optional().nullable(),
  site_id: z.number().optional().nullable(),
  campaign_id: z.number().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  custom_fields: z.record(z.string(), z.any()).optional().nullable(),
  source_system: z.string().optional().default('webhook'),
  external_id: z.string().optional().nullable(),
  webhook_signature: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const leadData = leadWebhookSchema.parse(body);

    // Optional: Webhook signature verification
    const webhookSignature = request.headers.get('x-webhook-signature');
    const sourceSystem = request.headers.get('x-source-system') || leadData.source_system;
    
    // TODO: Implement signature verification if needed
    // if (webhookSignature) {
    //   const isValid = verifyWebhookSignature(body, webhookSignature);
    //   if (!isValid) {
    //     return NextResponse.json(
    //       { success: false, error: 'Invalid webhook signature' },
    //       { status: 401 }
    //     );
    //   }
    // }

    // 1. Check for duplicates (by phone or email)
    let existingLeadId = null;
    
    const duplicateCheck = await db.query(
      `SELECT id, lead_code, status 
       FROM leads 
       WHERE phone = $1 OR (email IS NOT NULL AND email = $2)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [leadData.phone, leadData.email || null]
    );

    if (duplicateCheck.rows.length > 0) {
      existingLeadId = duplicateCheck.rows[0].id;
      
      // Log duplicate attempt
      await db.query(
        `INSERT INTO lead_activities 
        (lead_id, activity_type, description, metadata, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
        [
          existingLeadId,
          'webhook_duplicate',
          `Duplicate lead attempt from ${sourceSystem}`,
          JSON.stringify({
            source_system: sourceSystem,
            external_id: leadData.external_id,
            attempted_data: leadData,
          }),
        ]
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate lead detected',
          duplicate: true,
          existing_lead_id: existingLeadId,
          existing_lead_code: duplicateCheck.rows[0].lead_code,
          existing_status: duplicateCheck.rows[0].status,
        },
        { status: 409 } // Conflict
      );
    }

    // 2. Generate lead_code
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const todayLeadCountResult = await db.query(
      `SELECT COUNT(*) as count 
       FROM leads 
       WHERE lead_code LIKE $1`,
      [`LD-${dateStr}-%`]
    );
    const todayLeadCount = parseInt(todayLeadCountResult.rows[0].count);
    const leadCode = `LD-${dateStr}-${String(todayLeadCount + 1).padStart(4, '0')}`;

    // 3. Create lead
    const result = await db.query(
      `INSERT INTO leads 
      (lead_code, name, phone, email, network_id, site_id, campaign_id, 
       status, custom_fields, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        leadCode,
        leadData.name,
        leadData.phone,
        leadData.email,
        leadData.network_id,
        leadData.site_id,
        leadData.campaign_id,
        'new',
        JSON.stringify(leadData.custom_fields || {}),
      ]
    );

    const newLead = result.rows[0];

    // 4. Log activity
    await db.query(
      `INSERT INTO lead_activities 
      (lead_id, activity_type, description, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [
        newLead.id,
        'lead_created_webhook',
        `Lead oluşturuldu: ${sourceSystem} üzerinden webhook ile alındı`,
        JSON.stringify({
          source_system: sourceSystem,
          external_id: leadData.external_id,
          utm_source: leadData.utm_source,
          utm_medium: leadData.utm_medium,
          utm_campaign: leadData.utm_campaign,
        }),
      ]
    );

    // 5. Log webhook request
    await db.query(
      `INSERT INTO webhook_logs 
      (webhook_type, source_system, payload, lead_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        'lead-created',
        sourceSystem,
        JSON.stringify(body),
        newLead.id,
        'success',
      ]
    );

    // Response
    return NextResponse.json(
      {
        success: true,
        message: 'Lead created successfully via webhook',
        data: {
          lead_id: newLead.id,
          lead_code: newLead.lead_code,
          name: newLead.name,
          phone: newLead.phone,
          email: newLead.email,
          status: newLead.status,
          created_at: newLead.created_at,
        },
        webhook_info: {
          source_system: sourceSystem,
          external_id: leadData.external_id,
          processed_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Lead webhook error:', error);

    // Log failed webhook
    try {
      const body = await request.clone().json();
      await db.query(
        `INSERT INTO webhook_logs 
        (webhook_type, source_system, payload, status, error_message, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          'lead-created',
          request.headers.get('x-source-system') || 'unknown',
          JSON.stringify(body),
          'failed',
          error.message,
        ]
      );
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook payload',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
