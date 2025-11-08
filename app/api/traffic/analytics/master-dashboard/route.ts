/**
 * Master Dashboard Analytics API
 * GET /api/traffic/analytics/master-dashboard
 * 
 * Aggregates statistics from ALL domains for overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get all active domains
    const domainsResult = await db.query(`
      SELECT domain, db_schema 
      FROM master_domains 
      WHERE status = 'active'
    `);
    
    const domains = domainsResult.rows;
    
    if (domains.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            total_domains: 0,
            total_visits: 0,
            unique_visitors_today: 0,
            total_bots_detected: 0
          },
          hourly_traffic: [],
          top_domains: [],
          top_ips: [],
          recent_activity: []
        }
      });
    }
    
    // Aggregate stats from all domains
    let totalVisits = 0;
    let totalUniqueVisitorsToday = 0;
    let totalBotsDetected = 0;
    let hourlyTraffic: { [key: string]: number } = {};
    let topDomains: any[] = [];
    let allRecentActivity: any[] = [];
    let ipVisitCounts: { [key: string]: number } = {};
    
    for (const domain of domains) {
      const schema = domain.db_schema;
      
      try {
        // Check if table exists
        const tableCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [`${schema}_traffic_logs`]);
        
        if (!tableCheck.rows[0].exists) continue;
        
        // Get total visits for this domain
        const visitsResult = await db.query(`
          SELECT COUNT(*) as count FROM "${schema}_traffic_logs"
        `);
        const domainVisits = parseInt(visitsResult.rows[0]?.count || 0);
        totalVisits += domainVisits;
        
        // Get unique visitors today
        const todayResult = await db.query(`
          SELECT COUNT(DISTINCT ip_address) as count 
          FROM "${schema}_traffic_logs" 
          WHERE DATE(created_at) = CURRENT_DATE
        `);
        totalUniqueVisitorsToday += parseInt(todayResult.rows[0]?.count || 0);
        
        // Get bot detections
        const botsResult = await db.query(`
          SELECT COUNT(*) as count 
          FROM "${schema}_bot_detections" 
          WHERE is_fake = true
        `);
        totalBotsDetected += parseInt(botsResult.rows[0]?.count || 0);
        
        // Get hourly traffic (last 24h)
        const hourlyResult = await db.query(`
          SELECT 
            EXTRACT(HOUR FROM created_at) as hour,
            COUNT(*) as visits
          FROM "${schema}_traffic_logs"
          WHERE created_at > NOW() - INTERVAL '24 hours'
          GROUP BY hour
          ORDER BY hour
        `);
        
        hourlyResult.rows.forEach((row: any) => {
          const hour = String(row.hour);
          hourlyTraffic[hour] = (hourlyTraffic[hour] || 0) + parseInt(row.visits);
        });
        
        // Add to top domains
        topDomains.push({
          domain: domain.domain,
          visits: domainVisits,
          visitors_today: parseInt(todayResult.rows[0]?.count || 0)
        });
        
        // Get recent activity (last 20)
        const activityResult = await db.query(`
          SELECT 
            ip_address,
            path,
            user_agent,
            created_at
          FROM "${schema}_traffic_logs"
          ORDER BY created_at DESC
          LIMIT 20
        `);
        
        activityResult.rows.forEach((row: any) => {
          allRecentActivity.push({
            domain: domain.domain,
            ip: row.ip_address,
            path: row.path,
            user_agent: row.user_agent,
            timestamp: row.created_at
          });
        });
        
        // Count IP visits across all domains
        const ipCountResult = await db.query(`
          SELECT 
            ip_address,
            COUNT(*) as visits
          FROM "${schema}_traffic_logs"
          GROUP BY ip_address
        `);
        
        ipCountResult.rows.forEach((row: any) => {
          ipVisitCounts[row.ip_address] = (ipVisitCounts[row.ip_address] || 0) + parseInt(row.visits);
        });
        
      } catch (error) {
        console.error(`Error processing domain ${domain.domain}:`, error);
        continue;
      }
    }
    
    // Sort and format results
    topDomains.sort((a, b) => b.visits - a.visits);
    
    const topIps = Object.entries(ipVisitCounts)
      .map(([ip, visits]) => ({ ip, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);
    
    allRecentActivity.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const recentActivity = allRecentActivity.slice(0, 20);
    
    // Format hourly traffic
    const hourlyTrafficArray = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      visits: hourlyTraffic[String(i)] || 0
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_domains: domains.length,
          total_visits: totalVisits,
          unique_visitors_today: totalUniqueVisitorsToday,
          total_bots_detected: totalBotsDetected
        },
        hourly_traffic: hourlyTrafficArray,
        top_domains: topDomains.slice(0, 10),
        top_ips: topIps,
        recent_activity: recentActivity
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching master dashboard stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch master dashboard stats',
      message: error.message
    }, { status: 500 });
  }
}