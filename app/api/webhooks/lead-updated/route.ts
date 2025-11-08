import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * POST /api/webhooks/lead-updated
 * 
 * External sistemlerden lead update kabul etme webhook:
 * - Lead status güncelleme
 * - Lead bilgilerini güncelleme
 * - Activity logging
 * - Status change tracking
 * 
 * Request Body:
 * {
 *   "lead_id": number (optional - either lead_id or external_id required),
 *   "external_id": "string (optional)",
 *   "name": "string (optional)",
 *   "phone": "string (optional)",
 *   "email": "string (optional)",
 *   "status": "new|contacted|qualified|converted|rejected (optional)",
 *   "custom_fields": object (optional),
 *   "notes": "string (optional)",
 *   "source_system": "string (optional)"
 * }
 */

const leadUpdateWebhookSchema = z.object({
  lead_id: z.number().optional(),
  external_id: z.string().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected']).optional(),
  custom_fields: z.record(z.string(), z.any()).optional().nullable(),
  notes: z.string().optional(),
  source_system: z.string().optional().default('webhook'),
}).refine(data => data.lead_id || data.external_id, {
  message: 'Either lead_id or external_id must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updateData = leadUpdateWebhookSchema.parse(body);
    
    const sourceSystem = request.headers.get('x-source-system') || updateData.source_system;

    // 1. Find lead by ID or external_id
    let lead;
    
    if (updateData.lead_id) {
      const result = await db.query(
        `SELECT * FROM leads WHERE id = $1`,
        [updateData.lead_id]
      );
      lead = result.rows[0];
    } else if (updateData.external_id) {
      // Try to find by external_id in custom_fields or activities
      const result = await db.query(
        `SELECT l.* FROM leads l
         LEFT JOIN lead_activities la ON la.lead_id = l.id
         WHERE la.metadata->>'external_id' = $1
         ORDER BY l.created_at DESC
         LIMIT 1`,
        [updateData.external_id]
      );
      lead = result.rows[0];
    }

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lead not found',
          lead_id: updateData.lead_id,
          external_id: updateData.external_id,
        },
        { status: 404 }
      );
    }

    // 2. Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    const changes: Record<string, { old: any, new: any }> = {};

    if (updateData.name !== undefined && updateData.name !== lead.name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
      changes.name = { old: lead.name, new: updateData.name };
    }

    if (updateData.phone !== undefined && updateData.phone !== lead.phone) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(updateData.phone);
      changes.phone = { old: lead.phone, new: updateData.phone };
    }

    if (updateData.email !== undefined && updateData.email !== lead.email) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(updateData.email);
      changes.email = { old: lead.email, new: updateData.email };
    }

    if (updateData.status !== undefined && updateData.status !== lead.status) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(updateData.status);
      changes.status = { old: lead.status, new: updateData.status };
      
      // Update converted_at if status changed to converted
      if (updateData.status === 'converted') {
        updateFields.push(`converted_at = NOW()`);
      }
    }

    if (updateData.custom_fields !== undefined) {
      // Merge custom_fields
      const existingFields = lead.custom_fields || {};
      const mergedFields = { ...existingFields, ...updateData.custom_fields };
      updateFields.push(`custom_fields = $${paramIndex++}`);
      updateValues.push(JSON.stringify(mergedFields));
      changes.custom_fields = { old: existingFields, new: mergedFields };
    }

    // 3. Update lead if there are changes
    let updatedLead = lead;
    
    if (updateFields.length > 0) {
      updateValues.push(lead.id); // Add lead ID for WHERE clause
      
      const updateQuery = `
        UPDATE leads 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, updateValues);
      updatedLead = result.rows[0];
    }

    // 4. Log activity
    const changeDescription = Object.keys(changes).length > 0
      ? Object.entries(changes).map(([field, change]) => 
          `${field}: "${change.old}" → "${change.new}"`
        ).join(', ')
      : 'No changes';

    await db.query(
      `INSERT INTO lead_activities 
      (lead_id, activity_type, description, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [
        lead.id,
        'lead_updated_webhook',
        `Lead güncellendi: ${sourceSystem} üzerinden (${changeDescription})`,
        JSON.stringify({
          source_system: sourceSystem,
          external_id: updateData.external_id,
          changes: changes,
          notes: updateData.notes,
        }),
      ]
    );

    // 5. Log webhook request
    await db.query(
      `INSERT INTO webhook_logs 
      (webhook_type, source_system, payload, lead_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        'lead-updated',
        sourceSystem,
        JSON.stringify(body),
        lead.id,
        'success',
      ]
    );

    // Response
    return NextResponse.json(
      {
        success: true,
        message: 'Lead updated successfully via webhook',
        data: {
          lead_id: updatedLead.id,
          lead_code: updatedLead.lead_code,
          name: updatedLead.name,
          phone: updatedLead.phone,
          email: updatedLead.email,
          status: updatedLead.status,
          updated_at: new Date().toISOString(),
        },
        changes: changes,
        changes_count: Object.keys(changes).length,
        webhook_info: {
          source_system: sourceSystem,
          external_id: updateData.external_id,
          processed_at: new Date().toISOString(),
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Lead update webhook error:', error);

    // Log failed webhook
    try {
      const body = await request.clone().json();
      await db.query(
        `INSERT INTO webhook_logs 
        (webhook_type, source_system, payload, status, error_message, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          'lead-updated',
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
