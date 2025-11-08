// Station 2: Sites API - List and Create
// API endpoint for managing deployed sites

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/sites
 * List all deployed sites with their status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        ds.*,
        (SELECT COUNT(*) FROM nginx_configs nc WHERE nc.site_id = ds.id) as nginx_configs_count,
        (SELECT COUNT(*) FROM ssl_certificates sc WHERE sc.site_id = ds.id) as ssl_certs_count,
        (SELECT status FROM ssl_certificates sc WHERE sc.site_id = ds.id LIMIT 1) as ssl_status,
        (SELECT expires_at FROM ssl_certificates sc WHERE sc.site_id = ds.id LIMIT 1) as ssl_expires_at
      FROM deployed_sites ds
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push(`ds.status = $${params.length + 1}`);
      params.push(status);
    } else {
      // By default, exclude deleted and stopped sites
      conditions.push(`ds.status NOT IN ('deleted', 'stopped')`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      ORDER BY ds.deployed_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM deployed_sites';
    const countParams: any[] = [];
    if (status) {
      countQuery += ` WHERE status = $1`;
      countParams.push(status);
    } else {
      countQuery += ` WHERE status NOT IN ('deleted', 'stopped')`;
    }
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sites',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sites
 * Create a new deployed site entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      domain,
      file_path,
      site_type = 'static',
      clean_port,
      gray_port,
      aggr_port,
      mobile_clean_port,
      mobile_gray_port,
      mobile_aggr_port,
      ssl_enabled = false,
      deployed_by
    } = body;

    // Validation - domain is now optional
    if (!name || !file_path) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, file_path'
        },
        { status: 400 }
      );
    }

    // Validate site_type
    const validSiteTypes = ['static', 'nodejs', 'nextjs', 'react'];
    if (!validSiteTypes.includes(site_type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid site_type. Must be one of: ${validSiteTypes.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Check if domain already exists (only if domain is provided)
    if (domain) {
      const existingDomain = await db.query(
        'SELECT id FROM deployed_sites WHERE domain = $1',
        [domain]
      );

      if (existingDomain.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Domain already exists'
          },
          { status: 409 }
        );
      }
    }

    // Check if ports are already in use
    const portsToCheck = [clean_port, gray_port, aggr_port, mobile_clean_port, mobile_gray_port, mobile_aggr_port].filter(Boolean);
    
    if (portsToCheck.length > 0) {
      const portCheck = await db.query(
        `SELECT clean_port, gray_port, aggr_port, mobile_clean_port, mobile_gray_port, mobile_aggr_port
         FROM deployed_sites
         WHERE clean_port = ANY($1) OR gray_port = ANY($1) OR aggr_port = ANY($1)
            OR mobile_clean_port = ANY($1) OR mobile_gray_port = ANY($1) OR mobile_aggr_port = ANY($1)`,
        [portsToCheck]
      );

      if (portCheck.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'One or more ports are already in use by another site'
          },
          { status: 409 }
        );
      }
    }

    // Insert new site
    // Ensure domain is NULL if empty to avoid unique constraint issues
    const domainValue = domain && domain.trim() ? domain.trim() : null;
    
    const result = await db.query(
      `INSERT INTO deployed_sites (
        name, domain, file_path, site_type,
        clean_port, gray_port, aggr_port,
        mobile_clean_port, mobile_gray_port, mobile_aggr_port,
        ssl_enabled, status, deployed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'deploying', $12)
      RETURNING *`,
      [
        name, domainValue, file_path, site_type,
        clean_port, gray_port, aggr_port,
        mobile_clean_port, mobile_gray_port, mobile_aggr_port,
        ssl_enabled, deployed_by
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Site created successfully',
        data: result.rows[0]
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating site:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create site',
        message: error.message
      },
      { status: 500 }
    );
  }
}
