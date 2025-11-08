/**
 * Lead Activity History API
 * GET /api/leads/:id/history - Get lead activity history
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/leads/:id/history
 * Get comprehensive activity history for a lead
 */
export async function GET(
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const activity_type = searchParams.get('type'); // Filter by activity type

    // Check if lead exists
    const leadResult = await db.query(
      `SELECT 
        l.id, l.name, l.phone, l.status, l.created_at,
        l.first_contact_at, l.last_contact_at,
        l.call_count, l.converted_at
      FROM leads l
      WHERE l.id = $1`,
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

    // Build activities query
    let activitiesQuery = `
      SELECT 
        id, lead_id, activity_type, description, 
        metadata, created_at
      FROM lead_activities
      WHERE lead_id = $1
    `;

    const params: any[] = [id];

    if (activity_type) {
      params.push(activity_type);
      activitiesQuery += ` AND activity_type = $${params.length}`;
    }

    activitiesQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    // Get activities
    const activitiesResult = await db.query(activitiesQuery, params).catch(() => ({ rows: [] }));

    // Get call logs if table exists
    const callLogsResult = await db.query(
      `SELECT 
        id, call_result, duration_seconds, 
        notes, agent_id, created_at
      FROM lead_call_logs
      WHERE lead_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
      [id]
    ).catch(() => ({ rows: [] }));

    // Get tasks/reminders if table exists
    const tasksResult = await db.query(
      `SELECT 
        id, task_type, description, due_date, 
        status, completed_at, created_at
      FROM lead_tasks
      WHERE lead_id = $1
      ORDER BY due_date ASC, created_at DESC
      LIMIT 20`,
      [id]
    ).catch(() => ({ rows: [] }));

    // Get status change timeline
    const statusChanges = activitiesResult.rows.filter(
      (activity: any) => activity.activity_type === 'status_changed'
    );

    // Get call summary
    const callSummary = {
      total_calls: callLogsResult.rows.length,
      answered: callLogsResult.rows.filter((call: any) => call.call_result === 'answered').length,
      no_answer: callLogsResult.rows.filter((call: any) => call.call_result === 'no_answer').length,
      total_duration: callLogsResult.rows.reduce((sum: number, call: any) => sum + (call.duration_seconds || 0), 0),
    };

    // Get pending tasks
    const pendingTasks = tasksResult.rows.filter((task: any) => task.status === 'pending');

    // Calculate lead metrics
    const metrics = {
      days_since_created: Math.floor(
        (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
      days_since_last_contact: lead.last_contact_at
        ? Math.floor(
            (new Date().getTime() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
      days_to_conversion: lead.converted_at
        ? Math.floor(
            (new Date(lead.converted_at).getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
    };

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        status: lead.status,
        created_at: lead.created_at,
        first_contact_at: lead.first_contact_at,
        last_contact_at: lead.last_contact_at,
        converted_at: lead.converted_at,
      },
      metrics,
      activities: activitiesResult.rows,
      call_logs: callLogsResult.rows,
      call_summary: callSummary,
      tasks: tasksResult.rows,
      pending_tasks: pendingTasks,
      status_timeline: statusChanges,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching lead history',
      },
      { status: 500 }
    );
  }
}
