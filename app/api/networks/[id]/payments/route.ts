/**
 * Network Payments API
 * GET /api/networks/:id/payments - Get payment history for a network
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/networks/:id/payments
 * Get payment history and financial summary for a specific network
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
          message: 'Invalid network ID',
        },
        { status: 400 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const offset = (page - 1) * limit;

    // Check if network exists
    const networkResult = await db.query(
      `SELECT 
        id, name, price_per_lead, currency, 
        payment_method, iban, bank_name, account_holder
       FROM networks 
       WHERE id = $1`,
      [id]
    );

    if (networkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Network not found',
        },
        { status: 404 }
      );
    }

    const network = networkResult.rows[0];

    // Get payment transactions (grouped by period)
    let paymentsQuery = `
      SELECT 
        DATE_TRUNC('day', l.created_at) as payment_date,
        COUNT(l.id) as lead_count,
        SUM(l.network_cost) as total_amount,
        AVG(l.network_cost) as avg_cost_per_lead,
        STRING_AGG(DISTINCT l.status, ', ') as lead_statuses,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_count,
        COUNT(CASE WHEN l.status = 'rejected' THEN 1 END) as rejected_count
      FROM leads l
      WHERE l.network_id = $1 AND l.network_cost IS NOT NULL
    `;

    const params: any[] = [id];
    let paramIndex = 2;

    // Filter by date range
    if (dateFrom) {
      params.push(dateFrom);
      paymentsQuery += ` AND l.created_at >= $${paramIndex}::date`;
      paramIndex++;
    }

    if (dateTo) {
      params.push(dateTo);
      paymentsQuery += ` AND l.created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
      paramIndex++;
    }

    paymentsQuery += `
      GROUP BY DATE_TRUNC('day', l.created_at)
      ORDER BY payment_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const paymentsResult = await db.query(paymentsQuery, params);

    // Get total count of payment periods
    let countQuery = `
      SELECT COUNT(DISTINCT DATE_TRUNC('day', l.created_at)) as period_count
      FROM leads l
      WHERE l.network_id = $1 AND l.network_cost IS NOT NULL
    `;

    const countParams: any[] = [id];
    let countParamIndex = 2;

    if (dateFrom) {
      countParams.push(dateFrom);
      countQuery += ` AND l.created_at >= $${countParamIndex}::date`;
      countParamIndex++;
    }

    if (dateTo) {
      countParams.push(dateTo);
      countQuery += ` AND l.created_at <= $${countParamIndex}::date + INTERVAL '1 day'`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.period_count || '0');

    // Get financial summary
    const summaryResult = await db.query(
      `SELECT 
        COUNT(l.id) as total_leads,
        COALESCE(SUM(l.network_cost), 0) as total_paid,
        COALESCE(AVG(l.network_cost), 0) as avg_cost_per_lead,
        
        -- This month
        COUNT(CASE WHEN l.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as leads_this_month,
        COALESCE(SUM(CASE WHEN l.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN l.network_cost END), 0) as paid_this_month,
        
        -- Last month
        COUNT(CASE WHEN l.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
                   AND l.created_at < DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as leads_last_month,
        COALESCE(SUM(CASE WHEN l.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                          AND l.created_at < DATE_TRUNC('month', CURRENT_DATE) THEN l.network_cost END), 0) as paid_last_month,
        
        -- Pending/unpaid leads (leads not marked as paid)
        COUNT(CASE WHEN l.payment_status IS NULL OR l.payment_status = 'pending' THEN 1 END) as pending_leads,
        COALESCE(SUM(CASE WHEN l.payment_status IS NULL OR l.payment_status = 'pending' THEN l.network_cost END), 0) as pending_amount
        
      FROM leads l
      WHERE l.network_id = $1 AND l.network_cost IS NOT NULL`,
      [id]
    );

    const summary = summaryResult.rows[0];

    // Get monthly breakdown for the last 12 months
    const monthlyResult = await db.query(
      `SELECT 
        TO_CHAR(DATE_TRUNC('month', l.created_at), 'YYYY-MM') as month,
        COUNT(l.id) as lead_count,
        COALESCE(SUM(l.network_cost), 0) as total_amount
      FROM leads l
      WHERE l.network_id = $1 
        AND l.network_cost IS NOT NULL
        AND l.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
      GROUP BY DATE_TRUNC('month', l.created_at)
      ORDER BY month DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      network: {
        id: network.id,
        name: network.name,
        price_per_lead: parseFloat(network.price_per_lead),
        currency: network.currency,
        payment_info: {
          method: network.payment_method,
          iban: network.iban,
          bank_name: network.bank_name,
          account_holder: network.account_holder,
        },
      },
      summary: {
        total_leads: parseInt(summary.total_leads),
        total_paid: parseFloat(summary.total_paid),
        avg_cost_per_lead: parseFloat(summary.avg_cost_per_lead),
        
        this_month: {
          leads: parseInt(summary.leads_this_month),
          amount: parseFloat(summary.paid_this_month),
        },
        last_month: {
          leads: parseInt(summary.leads_last_month),
          amount: parseFloat(summary.paid_last_month),
        },
        pending: {
          leads: parseInt(summary.pending_leads),
          amount: parseFloat(summary.pending_amount),
        },
      },
      monthly_breakdown: monthlyResult.rows.map(row => ({
        month: row.month,
        lead_count: parseInt(row.lead_count),
        total_amount: parseFloat(row.total_amount),
      })),
      daily_payments: paymentsResult.rows.map(row => ({
        date: row.payment_date,
        lead_count: parseInt(row.lead_count),
        total_amount: parseFloat(row.total_amount),
        avg_cost_per_lead: parseFloat(row.avg_cost_per_lead),
        converted_count: parseInt(row.converted_count),
        rejected_count: parseInt(row.rejected_count),
        lead_statuses: row.lead_statuses,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Network payments fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching network payments',
      },
      { status: 500 }
    );
  }
}
