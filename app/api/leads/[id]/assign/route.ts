/**
 * Lead Assignment API
 * POST /api/leads/:id/assign - Assign lead to an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema
const assignSchema = z.object({
  agent_id: z.string().min(1, 'Agent ID is required'),
  notes: z.string().optional(),
});

/**
 * POST /api/leads/:id/assign
 * Assign lead to a specific agent
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
    const validation = assignSchema.safeParse(body);
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

    const { agent_id, notes } = validation.data;

    // Get current lead data
    const currentResult = await db.query(
      'SELECT id, name, assigned_agent_id FROM leads WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    const lead = currentResult.rows[0];
    const previousAgent = lead.assigned_agent_id;

    // Verify agent exists (if you have an agents/users table)
    // For now, we'll just accept any string as agent_id
    // In production, you'd verify against users table

    // Update lead assignment
    const result = await db.query(
      `UPDATE leads 
       SET assigned_agent_id = $1,
           assigned_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [agent_id, id]
    );

    // Log activity
    const activityDescription = previousAgent
      ? `Lead re-assigned: ${previousAgent} → ${agent_id}${notes ? ` (${notes})` : ''}`
      : `Lead assigned to: ${agent_id}${notes ? ` (${notes})` : ''}`;

    await db.query(
      `INSERT INTO lead_activities (
        lead_id, activity_type, description, metadata, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        id,
        'lead_assigned',
        activityDescription,
        JSON.stringify({
          previous_agent: previousAgent,
          new_agent: agent_id,
          notes: notes || null,
        }),
      ]
    ).catch(err => {
      console.warn('Could not log activity:', err.message);
    });

    // Create notification/task for agent (if notifications table exists)
    await db.query(
      `INSERT INTO agent_notifications (
        agent_id, type, title, message, lead_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        agent_id,
        'lead_assigned',
        'Yeni Lead Atandı',
        `${lead.name} adlı lead size atandı.`,
        id,
      ]
    ).catch(err => {
      console.warn('Could not create notification (table might not exist):', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Lead assigned successfully',
      lead: result.rows[0],
      previous_agent: previousAgent,
      new_agent: agent_id,
    });
  } catch (error) {
    console.error('Assignment error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error assigning lead',
      },
      { status: 500 }
    );
  }
}
