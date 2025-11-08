/**
 * Campaigns API Route
 * GET /api/campaigns - List all campaigns with filtering
 * POST /api/campaigns - Create new campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema for creating campaign
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional().nullable(),
  
  // Campaign type
  campaign_type: z.enum(['ppc', 'social', 'email', 'seo', 'affiliate', 'direct', 'other']).default('ppc'),
  
  // Association
  network_id: z.number().optional().nullable(),
  
  // Budget & Goals
  budget: z.number().min(0).optional().nullable(),
  budget_currency: z.string().default('TRY'),
  target_leads: z.number().min(0).optional().nullable(),
  target_conversions: z.number().min(0).optional().nullable(),
  cost_per_lead_target: z.number().min(0).optional().nullable(),
  
  // Schedule
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  
  // UTM tracking
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  
  // Status
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).default('draft'),
  
  // Additional
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

/**
 * GET /api/campaigns
 * List all campaigns with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const campaign_type = searchParams.get('type');
    const network_id = searchParams.get('network_id');

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        n.name as network_name,
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as total_conversions,
        COALESCE(SUM(l.network_cost), 0) as total_spent,
        COUNT(DISTINCT CASE WHEN l.created_at >= CURRENT_DATE THEN l.id END) as leads_today,
        COUNT(DISTINCT CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN l.id END) as leads_this_week
      FROM campaigns c
      LEFT JOIN networks n ON n.id = c.network_id
      LEFT JOIN leads l ON l.campaign_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by status
    if (status && ['draft', 'active', 'paused', 'completed', 'cancelled'].includes(status)) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }

    // Filter by campaign type
    if (campaign_type && ['ppc', 'social', 'email', 'seo', 'affiliate', 'direct', 'other'].includes(campaign_type)) {
      params.push(campaign_type);
      query += ` AND c.campaign_type = $${params.length}`;
    }

    // Filter by network
    if (network_id && !isNaN(Number(network_id))) {
      params.push(network_id);
      query += ` AND c.network_id = $${params.length}`;
    }

    // Search by name
    if (search) {
      params.push(`%${search}%`);
      query += ` AND c.name ILIKE $${params.length}`;
    }

    query += ` GROUP BY c.id, n.name ORDER BY c.created_at DESC`;

    // Add pagination
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM campaigns WHERE 1=1`;
    const countParams: any[] = [];

    if (status && ['draft', 'active', 'paused', 'completed', 'cancelled'].includes(status)) {
      countParams.push(status);
      countQuery += ` AND status = $${countParams.length}`;
    }

    if (campaign_type && ['ppc', 'social', 'email', 'seo', 'affiliate', 'direct', 'other'].includes(campaign_type)) {
      countParams.push(campaign_type);
      countQuery += ` AND campaign_type = $${countParams.length}`;
    }

    if (network_id && !isNaN(Number(network_id))) {
      countParams.push(network_id);
      countQuery += ` AND network_id = $${countParams.length}`;
    }

    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND name ILIKE $${countParams.length}`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0');

    return NextResponse.json({
      success: true,
      campaigns: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Campaigns list error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching campaigns',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Create new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = createCampaignSchema.safeParse(body);
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

    // Insert new campaign
    const result = await db.query(
      `INSERT INTO campaigns (
        name, description, campaign_type, network_id,
        budget, budget_currency, target_leads, target_conversions, cost_per_lead_target,
        start_date, end_date,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        status, tags, metadata, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [
        data.name,
        data.description || null,
        data.campaign_type,
        data.network_id || null,
        data.budget || null,
        data.budget_currency,
        data.target_leads || null,
        data.target_conversions || null,
        data.cost_per_lead_target || null,
        data.start_date || null,
        data.end_date || null,
        data.utm_source || null,
        data.utm_medium || null,
        data.utm_campaign || data.name, // Default to campaign name
        data.utm_term || null,
        data.utm_content || null,
        data.status,
        data.tags ? JSON.stringify(data.tags) : null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Campaign created successfully',
        campaign: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Campaign create error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error creating campaign',
      },
      { status: 500 }
    );
  }
}
