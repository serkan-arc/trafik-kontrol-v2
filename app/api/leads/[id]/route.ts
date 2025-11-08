/**
 * Individual Lead API Routes
 * GET /api/leads/:id - Get lead details
 * PUT /api/leads/:id - Update lead
 * DELETE /api/leads/:id - Delete lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema for updating lead
const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().nullable(),
  
  network_id: z.number().optional().nullable(),
  site_id: z.number().optional().nullable(),
  campaign_id: z.number().optional().nullable(),
  
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected']).optional(),
  source: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  
  product_interest: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  
  network_cost: z.number().optional().nullable(),
  assigned_agent_id: z.string().optional().nullable(),
  
  notes: z.string().optional().nullable(),
  custom_fields: z.record(z.string(), z.any()).optional().nullable(),
});

/**
 * GET /api/leads/:id
 * Get single lead details with related data
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

    // Fetch lead with related data
    const result = await db.query(
      `SELECT 
        l.*,
        n.name as network_name,
        s.name as site_name,
        c.name as campaign_name,
        COALESCE(l.assigned_agent_id, 'Atanmadı') as agent_name
      FROM leads l
      LEFT JOIN networks n ON n.id = l.network_id
      LEFT JOIN sites s ON s.id = l.site_id
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    // Get lead activities/history
    const activitiesResult = await db.query(
      `SELECT * FROM lead_activities 
       WHERE lead_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [id]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      lead: result.rows[0],
      activities: activitiesResult.rows,
    });
  } catch (error) {
    console.error('Lead fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching lead',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/leads/:id
 * Update lead information
 */
export async function PUT(
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
    const validation = updateLeadSchema.safeParse(body);
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

    const data = validation.data;

    // Check if lead exists
    const checkResult = await db.query('SELECT id FROM leads WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'custom_fields' && value) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add ID as last parameter
    values.push(id);

    const query = `
      UPDATE leads 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    // Log activity
    await db.query(
      `INSERT INTO lead_activities (
        lead_id, activity_type, description, created_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [
        id,
        'lead_updated',
        `Lead information updated: ${Object.keys(data).join(', ')}`,
      ]
    ).catch(err => {
      console.warn('Could not log activity:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully',
      lead: result.rows[0],
    });
  } catch (error) {
    console.error('Lead update error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error updating lead',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/:id
 * Delete lead (soft delete by marking as deleted)
 */
export async function DELETE(
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

    // Check if lead exists
    const checkResult = await db.query('SELECT id, name FROM leads WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    const lead = checkResult.rows[0];

    // Soft delete - add deleted_at timestamp
    await db.query(
      `UPDATE leads 
       SET status = 'rejected', 
           notes = COALESCE(notes || E'\n\n', '') || 'DELETED: ' || CURRENT_TIMESTAMP::text,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Log activity
    await db.query(
      `INSERT INTO lead_activities (
        lead_id, activity_type, description, created_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [
        id,
        'lead_deleted',
        `Lead marked as deleted: ${lead.name}`,
      ]
    ).catch(err => {
      console.warn('Could not log activity:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully (soft delete)',
    });
  } catch (error) {
    console.error('Lead delete error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error deleting lead',
      },
      { status: 500 }
    );
  }
}
