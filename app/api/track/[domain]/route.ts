/**
 * Multi-Domain Traffic Tracking API
 * POST /api/track/[domain] - Track visitor events for domain-based system
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

// CORS headers for cross-domain tracking
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params;
    
    // Get request headers for IP detection
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const cfIp = headersList.get('cf-connecting-ip');
    
    // Determine the client's real IP
    const clientIp = cfIp || forwarded?.split(',')[0] || realIp || '0.0.0.0';
    
    // Parse request body
    const body = await request.json();
    
    // Check if domain exists and get schema
    const domainCheck = await db.query(
      'SELECT id, domain, db_schema, status FROM master_domains WHERE domain = $1',
      [domain]
    );
    
    if (domainCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404, headers: corsHeaders }
      );
    }
    
    const domainInfo = domainCheck.rows[0];
    
    if (domainInfo.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Domain tracking is disabled' },
        { status: 403, headers: corsHeaders }
      );
    }
    
    const schema = domainInfo.db_schema || domain.replace(/\./g, '_');
    
    // Insert into traffic_logs table
    await db.query(`
      INSERT INTO "${schema}_traffic_logs" (
        ip_address,
        path,
        method,
        status_code,
        user_agent,
        referer,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      clientIp,
      body.page_url || '/',
      'GET',
      200,
      body.user_agent || headersList.get('user-agent') || 'Unknown',
      body.referrer || headersList.get('referer') || null
    ]);
    
    // Check or insert IP address info
    const ipCheck = await db.query(`
      SELECT * FROM "${schema}_ip_addresses" WHERE ip_address = $1
    `, [clientIp]);
    
    if (ipCheck.rows.length === 0) {
      // New IP address - insert it
      await db.query(`
        INSERT INTO "${schema}_ip_addresses" (
          ip_address,
          country,
          country_code,
          city,
          list_type,
          risk_score,
          first_seen,
          last_seen
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        clientIp,
        body.country || null,
        body.country_code || null,
        body.city || null,
        'unknown',
        0
      ]);
    } else {
      // Update last_seen for existing IP
      await db.query(`
        UPDATE "${schema}_ip_addresses" 
        SET last_seen = NOW() 
        WHERE ip_address = $1
      `, [clientIp]);
    }
    
    // Check for bot patterns (simple detection)
    const userAgent = body.user_agent || headersList.get('user-agent') || '';
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i, 
      /googlebot/i, /bingbot/i, /yandex/i, /baidu/i
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    
    if (isBot) {
      // Log bot detection
      await db.query(`
        INSERT INTO "${schema}_bot_detections" (
          ip_address,
          bot_type,
          detection_method,
          is_fake,
          confidence_score,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        clientIp,
        'crawler',
        'user_agent',
        false,
        0.8
      ]);
    }
    
    // Handle form submission if present
    if (body.event_type === 'form_submit' && body.form_data) {
      await db.query(`
        INSERT INTO "${schema}_form_submissions" (
          ip_address,
          form_data,
          is_spam,
          created_at
        ) VALUES ($1, $2, $3, NOW())
      `, [
        clientIp,
        body.form_data || {},
        false
      ]);
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Traffic tracked',
        ip: clientIp,
        domain: domain
      },
      { headers: corsHeaders }
    );
    
  } catch (error: any) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Tracking failed' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}