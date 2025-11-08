import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRuleById } from '@/lib/traffic/rules-helpers';

/**
 * GET /api/traffic/rules/[id]/history
 * Get execution history for a rule
 * 
 * Query params:
 *   - limit: number (default: 50)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id  } = await params;
  
  try {
    // First verify rule exists
    await getRuleById(id);

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get rule's triggered count
    const ruleResult = await db.query(
      'SELECT name, triggered_count, enabled FROM auto_rules WHERE id = $1',
      [id]
    );

    const rule = ruleResult.rows[0];

    // Get IPs affected by this rule from ip_decision_history
    // Note: admin_notes contains rule name, so we can search for it
    const historyResult = await db.query(
      `SELECT 
        idh.ip,
        idh.previous_status,
        idh.new_status,
        idh.redirect_version,
        idh.decision_date,
        idh.admin_user_id,
        idh.notes,
        it.country,
        it.risk_score
       FROM ip_decision_history idh
       LEFT JOIN ip_tracking it ON idh.ip = it.ip
       WHERE idh.notes LIKE $1
       ORDER BY idh.decision_date DESC
       LIMIT $2`,
      [`%Auto-rule: ${rule.name}%`, limit]
    );

    return NextResponse.json({
      success: true,
      data: {
        rule: {
          id: id,
          name: rule.name,
          enabled: rule.enabled,
          triggered_count: rule.triggered_count
        },
        history: historyResult.rows,
        count: historyResult.rows.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching rule history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch rule history',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}
