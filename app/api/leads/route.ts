/**
 * Leads API Route
 * GET /api/leads - Get all leads with filtering
 * POST /api/leads - Create new lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema for creating lead
const createLeadSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  
  // Optional contact info
  email: z.string().email('Invalid email').optional().nullable(),
  
  // Lead source
  network_id: z.number().optional().nullable(),
  site_id: z.number().optional().nullable(),
  campaign_id: z.number().optional().nullable(),
  
  // Lead details
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected']).default('new'),
  source: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  
  // Product/service interest
  product_interest: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  
  // Location
  city: z.string().optional().nullable(),
  country: z.string().default('TR'),
  
  // Financial
  network_cost: z.number().optional().nullable(),
  
  // Additional data
  notes: z.string().optional().nullable(),
  custom_fields: z.record(z.string(), z.any()).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    let query = `
      SELECT 
        l.*,
        COALESCE(l.assigned_agent_id, 'Atanmadı') as agent_name
      FROM leads l
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by time
    if (filter === 'today') {
      query += ` AND DATE(l.created_at) = CURRENT_DATE`;
    } else if (filter === 'week') {
      query += ` AND l.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    }

    // Filter by status
    if (filter && !['all', 'today', 'week'].includes(filter)) {
      params.push(filter);
      query += ` AND l.status = $${params.length}`;
    }

    // Search
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        l.customer_name ILIKE $${params.length}
        OR l.phone_number ILIKE $${params.length}
        OR l.id::text ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY l.created_at DESC LIMIT 100`;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      leads: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Leads route error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching leads',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 * Create new lead
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = createLeadSchema.safeParse(body);
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

    // Generate lead_code (format: LD-YYYYMMDD-XXXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const leadCode = `LD-${dateStr}-${randomNum}`;

    // Insert new lead
    const result = await db.query(
      `INSERT INTO leads (
        lead_code, name, phone, email,
        network_id, site_id, campaign_id,
        status, source, utm_source, utm_medium, utm_campaign,
        product_interest, budget, city, country,
        network_cost, notes, custom_fields,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [
        leadCode,
        data.name,
        data.phone,
        data.email || null,
        data.network_id || null,
        data.site_id || null,
        data.campaign_id || null,
        data.status,
        data.source || null,
        data.utm_source || null,
        data.utm_medium || null,
        data.utm_campaign || null,
        data.product_interest || null,
        data.budget || null,
        data.city || null,
        data.country,
        data.network_cost || null,
        data.notes || null,
        data.custom_fields ? JSON.stringify(data.custom_fields) : null,
      ]
    );

    // Log activity
    await db.query(
      `INSERT INTO lead_activities (
        lead_id, activity_type, description, created_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [
        result.rows[0].id,
        'lead_created',
        `Lead created: ${data.name} - ${data.phone}`,
      ]
    ).catch(err => {
      console.warn('Could not log activity:', err.message);
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Lead created successfully',
        lead: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Lead create error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error creating lead',
      },
      { status: 500 }
    );
  }
}
