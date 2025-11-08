/**
 * Site Tracking API
 * POST /api/sites/:id/tracking - Track visitor events and page views
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema for tracking events
const trackingSchema = z.object({
  // Session tracking
  session_id: z.string().optional(),
  visitor_id: z.string().optional(),
  
  // Event tracking
  event_type: z.enum(['pageview', 'form_view', 'form_submit', 'button_click', 'lead_capture', 'custom']).default('pageview'),
  event_name: z.string().optional(),
  
  // Page information
  page_url: z.string().url().optional(),
  page_title: z.string().optional(),
  referrer: z.string().optional(),
  
  // UTM tracking
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  
  // Device/Browser info
  user_agent: z.string().optional(),
  ip_address: z.string().optional(),
  device_type: z.enum(['desktop', 'mobile', 'tablet', 'unknown']).optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  
  // Geographic info
  country: z.string().optional(),
  city: z.string().optional(),
  
  // Lead data (if form submission)
  lead_data: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    custom_fields: z.record(z.string(), z.any()).optional(),
  }).optional(),
  
  // Additional metadata
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /api/sites/:id/tracking
 * Track visitor activity and events on site
 */
export async function POST(
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

    const body = await request.json();

    // Validate request body
    const validation = trackingSchema.safeParse(body);
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

    // Check if site exists and tracking is enabled
    const siteCheck = await db.query(
      'SELECT id, name, tracking_enabled, capture_config FROM sites WHERE id = $1',
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

    const site = siteCheck.rows[0];

    if (!site.tracking_enabled) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tracking is disabled for this site',
        },
        { status: 403 }
      );
    }

    // Generate session_id if not provided
    const sessionId = data.session_id || `SES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert tracking event
    const trackingResult = await db.query(
      `INSERT INTO site_tracking (
        site_id, session_id, visitor_id, event_type, event_name,
        page_url, page_title, referrer,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        user_agent, ip_address, device_type, browser, os,
        country, city, metadata, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP
      ) RETURNING id`,
      [
        id,
        sessionId,
        data.visitor_id || null,
        data.event_type,
        data.event_name || null,
        data.page_url || null,
        data.page_title || null,
        data.referrer || null,
        data.utm_source || null,
        data.utm_medium || null,
        data.utm_campaign || null,
        data.utm_term || null,
        data.utm_content || null,
        data.user_agent || null,
        data.ip_address || null,
        data.device_type || null,
        data.browser || null,
        data.os || null,
        data.country || null,
        data.city || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    ).catch(err => {
      console.warn('Could not insert tracking event (table might not exist):', err.message);
      return { rows: [] };
    });

    // If this is a lead capture event, create the lead
    let leadId = null;
    if (data.event_type === 'lead_capture' && data.lead_data) {
      const leadData = data.lead_data;
      
      // Check capture config
      const captureConfig = site.capture_config ? JSON.parse(site.capture_config) : {};

      // Generate lead code
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const leadCode = `LD-${dateStr}-${randomNum}`;

      try {
        const leadResult = await db.query(
          `INSERT INTO leads (
            lead_code, name, email, phone,
            site_id, source, utm_source, utm_medium, utm_campaign,
            country, city, custom_fields,
            status, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP
          ) RETURNING id`,
          [
            leadCode,
            captureConfig.capture_name !== false ? leadData.name : null,
            captureConfig.capture_email !== false ? leadData.email : null,
            captureConfig.capture_phone !== false ? leadData.phone : null,
            id,
            'website',
            data.utm_source || null,
            data.utm_medium || null,
            data.utm_campaign || null,
            data.country || null,
            captureConfig.capture_city !== false ? data.city : null,
            captureConfig.capture_custom_fields !== false && leadData.custom_fields
              ? JSON.stringify(leadData.custom_fields)
              : null,
            'new',
          ]
        );

        leadId = leadResult.rows[0].id;

        // Log lead creation activity
        await db.query(
          `INSERT INTO lead_activities (
            lead_id, activity_type, description, created_at
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [
            leadId,
            'lead_created',
            `Lead captured from site: ${site.name}`,
          ]
        ).catch(() => {
          // Ignore activity log errors
        });
      } catch (err) {
        console.error('Error creating lead from tracking:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
      tracking_id: trackingResult.rows[0]?.id || null,
      session_id: sessionId,
      lead_id: leadId,
    });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error tracking event',
      },
      { status: 500 }
    );
  }
}
