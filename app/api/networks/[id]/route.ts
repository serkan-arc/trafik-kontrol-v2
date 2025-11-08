/**
 * Networks API - Individual Network Routes
 * GET /api/networks/:id - Get network details
 * PUT /api/networks/:id - Update network
 * DELETE /api/networks/:id - Delete network
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema for updating network
const updateNetworkSchema = z.object({
  name: z.string().min(1, 'Network name is required').optional(),
  contact_email: z.string().email('Invalid email format').optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  price_per_lead: z.number().min(0, 'Price must be positive').optional(),
  currency: z.string().optional(),
  payment_method: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  account_holder: z.string().optional().nullable(),
  webhook_url: z.string().url('Invalid URL').optional().nullable(),
  api_token: z.string().optional().nullable(),
  quality_score: z.number().min(0).max(5).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * GET /api/networks/:id
 * Get single network details with statistics
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate ID is a number
    if (isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid network ID',
        },
        { status: 400 }
      );
    }

    // Fetch network with aggregated statistics
    const result = await db.query(
      `SELECT 
        n.*,
        COUNT(DISTINCT l.id) as total_leads_received,
        COALESCE(SUM(l.network_cost), 0) as total_amount_paid,
        COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as converted_leads,
        COUNT(DISTINCT CASE WHEN l.status = 'rejected' THEN l.id END) as rejected_leads,
        COUNT(DISTINCT CASE WHEN l.created_at >= CURRENT_DATE THEN l.id END) as leads_today,
        COUNT(DISTINCT CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN l.id END) as leads_this_week,
        COALESCE(AVG(l.network_cost), 0) as avg_lead_cost
      FROM networks n
      LEFT JOIN leads l ON l.network_id = n.id
      WHERE n.id = $1
      GROUP BY n.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Network not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      network: result.rows[0],
    });
  } catch (error) {
    console.error('Network fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching network',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/networks/:id
 * Update network information
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
          message: 'Invalid network ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = updateNetworkSchema.safeParse(body);
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

    // Check if network exists
    const checkResult = await db.query('SELECT id FROM networks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Network not found',
        },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add ID as last parameter
    values.push(id);

    const query = `
      UPDATE networks 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    return NextResponse.json({
      success: true,
      message: 'Network updated successfully',
      network: result.rows[0],
    });
  } catch (error) {
    console.error('Network update error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error updating network',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/networks/:id
 * Delete network (soft delete by setting status to inactive)
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
          message: 'Invalid network ID',
        },
        { status: 400 }
      );
    }

    // Check if network exists
    const checkResult = await db.query('SELECT id FROM networks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Network not found',
        },
        { status: 404 }
      );
    }

    // Check if network has associated leads
    const leadsCheck = await db.query(
      'SELECT COUNT(*) as lead_count FROM leads WHERE network_id = $1',
      [id]
    );
    const leadCount = parseInt(leadsCheck.rows[0]?.lead_count || '0');

    if (leadCount > 0) {
      // Soft delete - set status to inactive
      await db.query(
        `UPDATE networks 
         SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [id]
      );

      return NextResponse.json({
        success: true,
        message: `Network deactivated successfully. ${leadCount} associated leads preserved.`,
        soft_delete: true,
      });
    } else {
      // Hard delete - no associated leads
      await db.query('DELETE FROM networks WHERE id = $1', [id]);

      return NextResponse.json({
        success: true,
        message: 'Network deleted successfully',
        soft_delete: false,
      });
    }
  } catch (error) {
    console.error('Network delete error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error deleting network',
      },
      { status: 500 }
    );
  }
}
