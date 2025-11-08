/**
 * Networks API Route
 * GET /api/networks - List all networks
 * POST /api/networks - Create new network
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema for creating network
const createNetworkSchema = z.object({
  name: z.string().min(1, 'Network name is required'),
  contact_email: z.string().email('Invalid email format').optional(),
  contact_phone: z.string().optional(),
  price_per_lead: z.number().min(0, 'Price must be positive'),
  currency: z.string().default('TRY'),
  payment_method: z.string().optional(),
  iban: z.string().optional(),
  bank_name: z.string().optional(),
  account_holder: z.string().optional(),
  webhook_url: z.string().url('Invalid URL').optional().nullable(),
  api_token: z.string().optional().nullable(),
  quality_score: z.number().min(0).max(5).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

/**
 * GET /api/networks
 * List all networks with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // active/inactive
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        n.*,
        COUNT(l.id) as total_leads_received,
        COALESCE(SUM(l.network_cost), 0) as total_amount_paid
      FROM networks n
      LEFT JOIN leads l ON l.network_id = n.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by status
    if (status && ['active', 'inactive'].includes(status)) {
      params.push(status);
      query += ` AND n.status = $${params.length}`;
    }

    // Search by name
    if (search) {
      params.push(`%${search}%`);
      query += ` AND n.name ILIKE $${params.length}`;
    }

    query += ` GROUP BY n.id ORDER BY n.created_at DESC`;

    // Add pagination
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM networks WHERE 1=1`;
    const countParams: any[] = [];

    if (status && ['active', 'inactive'].includes(status)) {
      countParams.push(status);
      countQuery += ` AND status = $${countParams.length}`;
    }

    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND name ILIKE $${countParams.length}`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0');

    return NextResponse.json({
      success: true,
      networks: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Networks list error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching networks',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/networks
 * Create new network
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = createNetworkSchema.safeParse(body);
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

    // Insert new network
    const result = await db.query(
      `INSERT INTO networks (
        name, contact_email, contact_phone, price_per_lead, currency,
        payment_method, iban, bank_name, account_holder,
        webhook_url, api_token, quality_score, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.name,
        data.contact_email || null,
        data.contact_phone || null,
        data.price_per_lead,
        data.currency,
        data.payment_method || null,
        data.iban || null,
        data.bank_name || null,
        data.account_holder || null,
        data.webhook_url || null,
        data.api_token || null,
        data.quality_score || null,
        data.status,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Network created successfully',
        network: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Network create error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error creating network',
      },
      { status: 500 }
    );
  }
}
