/**
 * Individual Campaign API Routes
 * GET /api/campaigns/:id - Get campaign details
 * PUT /api/campaigns/:id - Update campaign
 * DELETE /api/campaigns/:id - Delete campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema for updating campaign
const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  campaign_type: z.enum(['ppc', 'social', 'email', 'seo', 'affiliate', 'direct', 'other']).optional(),
  
  network_id: z.number().optional().nullable(),
  
  budget: z.number().min(0).optional().nullable(),
  budget_currency: z.string().optional(),
  target_leads: z.number().min(0).optional().nullable(),
  target_conversions: z.number().min(0).optional().nullable(),
  cost_per_lead_target: z.number().min(0).optional().nullable(),
  
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
  
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

/**
 * GET /api/campaigns/:id
 * Get single campaign details with statistics
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
          message: 'Invalid campaign ID',
        },
        { status: 400 }
      );
    }

    // Fetch campaign with aggregated statistics
    const result = await db.query(
      `SELECT 
        c.*,
        n.name as network_name,
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as total_conversions,
        COUNT(DISTINCT CASE WHEN l.status = 'rejected' THEN l.id END) as total_rejected,
        COALESCE(SUM(l.network_cost), 0) as total_spent,
        COALESCE(AVG(l.network_cost), 0) as avg_cost_per_lead,
        COUNT(DISTINCT CASE WHEN l.created_at >= CURRENT_DATE THEN l.id END) as leads_today,
        COUNT(DISTINCT CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN l.id END) as leads_this_week,
        COUNT(DISTINCT CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN l.id END) as leads_this_month
      FROM campaigns c
      LEFT JOIN networks n ON n.id = c.network_id
      LEFT JOIN leads l ON l.campaign_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, n.name`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campaign not found',
        },
        { status: 404 }
      );
    }

    const campaign = result.rows[0];

    // Calculate performance metrics
    const totalLeads = parseInt(campaign.total_leads);
    const totalConversions = parseInt(campaign.total_conversions);
    const totalSpent = parseFloat(campaign.total_spent);
    const budget = parseFloat(campaign.budget || 0);

    const performance = {
      conversion_rate: totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(2) : '0.00',
      budget_used_percentage: budget > 0 ? ((totalSpent / budget) * 100).toFixed(2) : '0.00',
      remaining_budget: budget - totalSpent,
      target_completion: campaign.target_leads > 0 
        ? ((totalLeads / parseInt(campaign.target_leads)) * 100).toFixed(2) 
        : '0.00',
      cost_per_conversion: totalConversions > 0 
        ? (totalSpent / totalConversions).toFixed(2) 
        : '0.00',
    };

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        performance,
      },
    });
  } catch (error) {
    console.error('Campaign fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching campaign',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/campaigns/:id
 * Update campaign information
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
          message: 'Invalid campaign ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = updateCampaignSchema.safeParse(body);
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

    // Check if campaign exists
    const checkResult = await db.query('SELECT id FROM campaigns WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campaign not found',
        },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (['tags', 'metadata'].includes(key) && value !== null) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No fields to update',
        },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add ID as last parameter
    values.push(id);

    const query = `
      UPDATE campaigns 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    return NextResponse.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('Campaign update error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error updating campaign',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/:id
 * Delete campaign (soft delete if has leads, hard delete otherwise)
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
          message: 'Invalid campaign ID',
        },
        { status: 400 }
      );
    }

    // Check if campaign exists
    const checkResult = await db.query('SELECT id, name FROM campaigns WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campaign not found',
        },
        { status: 404 }
      );
    }

    // Check if campaign has associated leads
    const leadsCheck = await db.query(
      'SELECT COUNT(*) as lead_count FROM leads WHERE campaign_id = $1',
      [id]
    );
    const leadCount = parseInt(leadsCheck.rows[0]?.lead_count || '0');

    if (leadCount > 0) {
      // Soft delete - set status to cancelled
      await db.query(
        `UPDATE campaigns 
         SET status = 'cancelled', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [id]
      );

      return NextResponse.json({
        success: true,
        message: `Campaign cancelled successfully. ${leadCount} associated leads preserved.`,
        soft_delete: true,
      });
    } else {
      // Hard delete - no associated leads
      await db.query('DELETE FROM campaigns WHERE id = $1', [id]);

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully',
        soft_delete: false,
      });
    }
  } catch (error) {
    console.error('Campaign delete error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error deleting campaign',
      },
      { status: 500 }
    );
  }
}
