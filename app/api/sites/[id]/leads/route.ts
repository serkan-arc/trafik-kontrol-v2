/**
 * Site Leads API
 * GET /api/sites/:id/leads - Get all leads from a specific site
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/sites/:id/leads
 * Get all leads associated with a specific site
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
          message: 'Invalid site ID',
        },
        { status: 400 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Check if site exists
    const siteCheck = await db.query(
      'SELECT id, name, url FROM sites WHERE id = $1',
      [id]
    );

    if (siteCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Site not found',
        },
        { status: 404 }
      );
    }

    // Build query
    let query = `
      SELECT 
        l.*,
        n.name as network_name,
        c.name as campaign_name,
        COALESCE(l.assigned_agent_id, 'Atanmadı') as agent_name
      FROM leads l
      LEFT JOIN networks n ON n.id = l.network_id
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.site_id = $1
    `;

    const params: any[] = [id];
    let paramIndex = 2;

    // Filter by status
    if (status && ['new', 'contacted', 'qualified', 'converted', 'rejected'].includes(status)) {
      params.push(status);
      query += ` AND l.status = $${paramIndex}`;
      paramIndex++;
    }

    // Filter by date range
    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND l.created_at >= $${paramIndex}::date`;
      paramIndex++;
    }

    if (dateTo) {
      params.push(dateTo);
      query += ` AND l.created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
      paramIndex++;
    }

    // Search in name, phone, email
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        l.name ILIKE $${paramIndex} OR 
        l.phone ILIKE $${paramIndex} OR 
        l.email ILIKE $${paramIndex}
      )`;
      paramIndex++;
    }

    // Order and pagination
    query += ` ORDER BY l.created_at DESC`;
    params.push(limit, offset);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM leads l WHERE l.site_id = $1`;
    const countParams: any[] = [id];
    let countParamIndex = 2;

    if (status && ['new', 'contacted', 'qualified', 'converted', 'rejected'].includes(status)) {
      countParams.push(status);
      countQuery += ` AND l.status = $${countParamIndex}`;
      countParamIndex++;
    }

    if (dateFrom) {
      countParams.push(dateFrom);
      countQuery += ` AND l.created_at >= $${countParamIndex}::date`;
      countParamIndex++;
    }

    if (dateTo) {
      countParams.push(dateTo);
      countQuery += ` AND l.created_at <= $${countParamIndex}::date + INTERVAL '1 day'`;
      countParamIndex++;
    }

    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (
        l.name ILIKE $${countParamIndex} OR 
        l.phone ILIKE $${countParamIndex} OR 
        l.email ILIKE $${countParamIndex}
      )`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get summary stats for this filtered set
    const summaryResult = await db.query(
      `SELECT 
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted,
        COUNT(CASE WHEN l.status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN l.status = 'new' THEN 1 END) as new_leads
      FROM leads l
      WHERE l.site_id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      site: {
        id: siteCheck.rows[0].id,
        name: siteCheck.rows[0].name,
        url: siteCheck.rows[0].url,
      },
      leads: result.rows,
      summary: {
        total_leads: parseInt(summaryResult.rows[0].total_leads),
        converted: parseInt(summaryResult.rows[0].converted),
        rejected: parseInt(summaryResult.rows[0].rejected),
        new_leads: parseInt(summaryResult.rows[0].new_leads),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Site leads fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching site leads',
      },
      { status: 500 }
    );
  }
}
