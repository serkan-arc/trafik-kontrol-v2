/**
 * Lead Call Logging API
 * POST /api/leads/:id/call - Log a call activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema
const callSchema = z.object({
  call_result: z.enum(['answered', 'no_answer', 'busy', 'invalid_number', 'callback_requested']),
  duration_seconds: z.number().min(0).optional(),
  notes: z.string().optional(),
  scheduled_callback: z.string().datetime().optional().nullable(),
  agent_id: z.string().optional(),
});

/**
 * POST /api/leads/:id/call
 * Log a call attempt/activity for a lead
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate ID
    if (isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lead ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = callSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { call_result, duration_seconds, notes, scheduled_callback, agent_id } = validation.data;

    // Check if lead exists
    const leadResult = await db.query(
      'SELECT id, name, phone FROM leads WHERE id = $1',
      [id]
    );

    if (leadResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    const lead = leadResult.rows[0];

    // Insert call log
    const callLogResult = await db.query(
      `INSERT INTO lead_call_logs (
        lead_id, call_result, duration_seconds, 
        notes, agent_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        id,
        call_result,
        duration_seconds || 0,
        notes || null,
        agent_id || null,
      ]
    ).catch(err => {
      console.warn('Could not insert call log (table might not exist):', err.message);
      return { rows: [] };
    });

    // Update lead's last_contact_at and call count
    await db.query(
      `UPDATE leads 
       SET last_contact_at = CURRENT_TIMESTAMP,
           call_count = COALESCE(call_count, 0) + 1,
           first_contact_at = COALESCE(first_contact_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // If answered and status is 'new', update to 'contacted'
    if (call_result === 'answered') {
      await db.query(
        `UPDATE leads 
         SET status = CASE 
           WHEN status = 'new' THEN 'contacted'
           ELSE status
         END
         WHERE id = $1`,
        [id]
      );
    }

    // If callback requested, add reminder/task
    if (scheduled_callback) {
      await db.query(
        `INSERT INTO lead_tasks (
          lead_id, task_type, description, due_date, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          id,
          'callback',
          `Callback requested: ${notes || 'Follow up required'}`,
          scheduled_callback,
          'pending',
        ]
      ).catch(err => {
        console.warn('Could not create callback task:', err.message);
      });
    }

    // Log activity
    const callResultNames: Record<string, string> = {
      answered: 'Cevaplandı',
      no_answer: 'Cevapsız',
      busy: 'Meşgul',
      invalid_number: 'Geçersiz Numara',
      callback_requested: 'Geri Arama Talep Edildi',
    };

    const activityDescription = `Arama yapıldı: ${callResultNames[call_result] || call_result}${
      duration_seconds ? ` (${duration_seconds}s)` : ''
    }${notes ? ` - ${notes}` : ''}`;

    await db.query(
      `INSERT INTO lead_activities (
        lead_id, activity_type, description, metadata, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        id,
        'call_logged',
        activityDescription,
        JSON.stringify({
          call_result,
          duration_seconds,
          scheduled_callback,
          agent_id,
        }),
      ]
    ).catch(err => {
      console.warn('Could not log activity:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Call logged successfully',
      call_log: callLogResult.rows[0] || null,
      scheduled_callback: scheduled_callback || null,
    });
  } catch (error) {
    console.error('Call logging error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error logging call',
      },
      { status: 500 }
    );
  }
}
