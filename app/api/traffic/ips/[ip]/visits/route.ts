/**
 * IP Management API - Get IP Visit History
 * 
 * GET /api/traffic/ips/[ip]/visits
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import logger from '@/lib/utils/logger';
import { ErrorHandler, AppError, ErrorType } from '@/lib/utils/errorHandler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  try {
    const { ip } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      throw new AppError('Invalid IP address format', ErrorType.VALIDATION, 400);
    }

    // Build query with filters
    let query = `
      SELECT 
        td.id,
        td.timestamp,
        td.page_url,
        td.referrer,
        td.user_agent,
        td.country,
        td.city,
        td.is_bot,
        td.bot_type,
        td.session_duration,
        s.domain as site_domain
      FROM traffic_data td
      LEFT JOIN sites s ON td.site_id = s.id
      WHERE td.ip_address = $1
    `;
    
    const queryParams: any[] = [ip];
    let paramIndex = 2;

    // Add date filters if provided
    if (startDate) {
      query += ` AND td.timestamp >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND td.timestamp <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY td.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Execute main query
    const visitsResult = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM traffic_data
      WHERE ip_address = $1
    `;
    const countParams: any[] = [ip];
    
    if (startDate || endDate) {
      if (startDate) {
        countQuery += ` AND timestamp >= $2`;
        countParams.push(startDate);
      }
      if (endDate) {
        countQuery += ` AND timestamp <= $${countParams.length + 1}`;
        countParams.push(endDate);
      }
    }

    const countResult = await db.query(countQuery, countParams);
    const totalVisits = parseInt(countResult.rows[0]?.total || '0');

    // Get aggregated statistics for this IP
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT site_id) as sites_visited,
        COUNT(DISTINCT DATE(timestamp)) as active_days,
        AVG(session_duration) as avg_session_duration,
        SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) as bot_visits,
        SUM(CASE WHEN is_bot THEN 0 ELSE 1 END) as human_visits,
        MIN(timestamp) as first_visit,
        MAX(timestamp) as last_visit
      FROM traffic_data
      WHERE ip_address = $1
    `;

    const statsResult = await db.query(statsQuery, [ip]);
    const stats = statsResult.rows[0];

    // Format the response data
    const visits = visitsResult.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      page_url: row.page_url,
      referrer: row.referrer || 'direct',
      user_agent: row.user_agent,
      location: {
        country: row.country,
        city: row.city
      },
      bot_info: row.is_bot ? {
        is_bot: true,
        type: row.bot_type
      } : {
        is_bot: false
      },
      session_duration: row.session_duration,
      site_domain: row.site_domain
    }));

    // Check if IP exists in ip_tracking table for additional info
    const ipTrackingQuery = `
      SELECT 
        is_blocked,
        risk_score,
        notes
      FROM ip_tracking
      WHERE ip = $1
    `;
    
    const ipTrackingResult = await db.query(ipTrackingQuery, [ip]);
    const ipInfo = ipTrackingResult.rows[0] || {};

    logger.info(`Retrieved ${visits.length} visits for IP ${ip}`);

    return NextResponse.json({
      success: true,
      data: {
        ip: ip,
        visits: visits,
        pagination: {
          total: totalVisits,
          limit: limit,
          offset: offset,
          has_more: offset + limit < totalVisits
        },
        statistics: {
          total_visits: totalVisits,
          sites_visited: parseInt(stats.sites_visited || '0'),
          active_days: parseInt(stats.active_days || '0'),
          avg_session_duration: parseFloat(stats.avg_session_duration || '0'),
          bot_visits: parseInt(stats.bot_visits || '0'),
          human_visits: parseInt(stats.human_visits || '0'),
          first_visit: stats.first_visit,
          last_visit: stats.last_visit
        },
        ip_status: {
          is_blocked: ipInfo.is_blocked || false,
          risk_score: ipInfo.risk_score || 0,
          notes: ipInfo.notes
        }
      }
    });

  } catch (error: any) {
    const appError = ErrorHandler.handle(error, 'GET /api/traffic/ips/[ip]/visits');
    
    return NextResponse.json({
      success: false,
      error: appError.message,
      type: appError.type
    }, { status: appError.statusCode });
  }
}