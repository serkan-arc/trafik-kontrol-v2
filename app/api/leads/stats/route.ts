/**
 * Leads Stats API Route
 * GET /api/leads/stats - Get lead statistics
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Today's leads
    const todayResult = await db.query(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // This week's leads
    const weekResult = await db.query(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    // Total leads
    const totalResult = await db.query(`
      SELECT COUNT(*) as count
      FROM leads
    `);

    // Sales completed
    const salesResult = await db.query(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE status = 'sale_completed'
    `);

    const stats = {
      today: parseInt(todayResult.rows[0]?.count || '0'),
      week: parseInt(weekResult.rows[0]?.count || '0'),
      total: parseInt(totalResult.rows[0]?.count || '0'),
      sales: parseInt(salesResult.rows[0]?.count || '0'),
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Stats route error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching stats',
        stats: { today: 0, week: 0, total: 0, sales: 0 },
      },
      { status: 500 }
    );
  }
}
