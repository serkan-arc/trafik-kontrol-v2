import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    // TODO: Implement real database queries when n8n tables are ready
    // For now, return mock data
    
    const stats = {
      total_workflows: 0,
      active_workflows: 0,
      total_executions_today: 0,
      successful_executions: 0,
      failed_executions: 0,
      total_webhooks: 0,
      webhook_calls_today: 0,
      total_errors_today: 0,
    }

    /* Real implementation when tables are ready:
    
    // Get workflow stats
    const workflowStats = await sql`
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(*) FILTER (WHERE status = 'active') as active_workflows
      FROM n8n_workflows
    `
    
    // Get execution stats (today)
    const executionStats = await sql`
      SELECT 
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
        COUNT(*) FILTER (WHERE status = 'error') as failed_executions
      FROM n8n_executions
      WHERE DATE(created_at) = CURRENT_DATE
    `
    
    // Get webhook stats
    const webhookStats = await sql`
      SELECT 
        COUNT(*) as total_webhooks
      FROM n8n_webhooks
    `
    
    const webhookCallsStats = await sql`
      SELECT COUNT(*) as webhook_calls_today
      FROM n8n_webhook_logs
      WHERE DATE(created_at) = CURRENT_DATE
    `
    
    // Get error stats
    const errorStats = await sql`
      SELECT COUNT(*) as total_errors
      FROM n8n_errors
      WHERE DATE(created_at) = CURRENT_DATE
    `
    
    stats = {
      total_workflows: parseInt(workflowStats.rows[0].total_workflows || '0'),
      active_workflows: parseInt(workflowStats.rows[0].active_workflows || '0'),
      total_executions_today: parseInt(executionStats.rows[0].total_executions || '0'),
      successful_executions: parseInt(executionStats.rows[0].successful_executions || '0'),
      failed_executions: parseInt(executionStats.rows[0].failed_executions || '0'),
      total_webhooks: parseInt(webhookStats.rows[0].total_webhooks || '0'),
      webhook_calls_today: parseInt(webhookCallsStats.rows[0].webhook_calls_today || '0'),
      total_errors_today: parseInt(errorStats.rows[0].total_errors || '0'),
    }
    */

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    console.error('n8n stats error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch n8n stats'
      },
      { status: 500 }
    )
  }
}
