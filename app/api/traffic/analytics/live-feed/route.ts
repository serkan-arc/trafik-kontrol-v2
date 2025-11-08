/**
 * Traffic Analytics API - Live Activity Feed
 * 
 * GET /api/traffic/analytics/live-feed?limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Get recent activities from multiple sources
    const activities: any[] = [];

    // 1. Recent IP list changes
    const listChangesQuery = `
      SELECT 
        ip,
        list_status,
        last_seen as timestamp,
        'list_change' as activity_type
      FROM ip_tracking
      WHERE updated_at >= NOW() - INTERVAL '1 hour'
      ORDER BY updated_at DESC
      LIMIT ${Math.floor(limit / 2)}
    `;
    const listChanges = await db.query(listChangesQuery);

    listChanges.rows.forEach(row => {
      activities.push({
        id: `list-${row.ip}-${Date.now()}`,
        timestamp: row.timestamp,
        ip: row.ip,
        action: `Moved to ${row.list_status}`,
        details: `IP status changed`,
        type: row.list_status
      });
    });

    // 2. Recent form submissions
    const formsQuery = `
      SELECT 
        ip,
        form_name,
        spam_score,
        submitted_at as timestamp,
        is_spam
      FROM form_submission_history
      WHERE submitted_at >= NOW() - INTERVAL '1 hour'
      ORDER BY submitted_at DESC
      LIMIT ${Math.floor(limit / 3)}
    `;
    const forms = await db.query(formsQuery);

    forms.rows.forEach(row => {
      activities.push({
        id: `form-${row.ip}-${Date.now()}`,
        timestamp: row.timestamp,
        ip: row.ip,
        action: row.is_spam ? 'Spam submission detected' : 'Form submission detected',
        details: `${row.form_name} - Spam Score: ${row.spam_score}`,
        type: row.is_spam ? 'spam' : 'form'
      });
    });

    // 3. Recent bot detections
    const botsQuery = `
      SELECT 
        ip,
        bot_type,
        dns_verified as is_verified,
        last_seen as timestamp
      FROM ip_user_agent_history
      WHERE last_seen >= NOW() - INTERVAL '1 hour'
        AND is_bot = true
      ORDER BY last_seen DESC
      LIMIT ${Math.floor(limit / 3)}
    `;
    const bots = await db.query(botsQuery);

    bots.rows.forEach(row => {
      activities.push({
        id: `bot-${row.ip}-${Date.now()}`,
        timestamp: row.timestamp,
        ip: row.ip,
        action: row.is_verified ? `Bot verified (${row.bot_type})` : `Fake bot detected (${row.bot_type})`,
        details: row.is_verified ? 'DNS validation successful' : 'DNS validation failed',
        type: 'bot'
      });
    });

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit to requested number
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedActivities
    });

  } catch (error: any) {
    console.error('Error in GET /api/traffic/analytics/live-feed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live activity feed',
      message: error.message
    }, { status: 500 });
  }
}
