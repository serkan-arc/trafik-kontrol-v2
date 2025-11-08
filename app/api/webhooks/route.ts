import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * GET /api/webhooks
 * List all webhook configurations
 * 
 * POST /api/webhooks
 * Create new webhook configuration
 */

const webhookConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  webhook_type: z.enum(['lead-created', 'lead-updated', 'network-callback', 'custom']),
  target_url: z.string().url('Valid URL required'),
  secret_key: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  retry_count: z.number().min(0).max(10).optional().default(3),
  timeout_seconds: z.number().min(1).max(300).optional().default(30),
  headers: z.record(z.string(), z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

// GET - List webhook configurations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const is_active = searchParams.get('is_active');
    const webhook_type = searchParams.get('webhook_type');

    let whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (is_active !== null) {
      whereConditions.push(`is_active = $${paramIndex++}`);
      queryParams.push(is_active === 'true');
    }

    if (webhook_type) {
      whereConditions.push(`webhook_type = $${paramIndex++}`);
      queryParams.push(webhook_type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT 
        id, name, webhook_type, target_url, is_active,
        retry_count, timeout_seconds, headers, filters,
        created_at, updated_at,
        (SELECT COUNT(*) FROM webhook_logs WHERE webhook_logs.webhook_type = webhooks.webhook_type) as total_calls,
        (SELECT COUNT(*) FROM webhook_logs WHERE webhook_logs.webhook_type = webhooks.webhook_type AND status = 'success') as successful_calls
      FROM webhooks
      ${whereClause}
      ORDER BY created_at DESC`,
      queryParams
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        secret_key: '***', // Hide secret key
      })),
      total: result.rows.length,
    });

  } catch (error: any) {
    console.error('List webhooks error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

// POST - Create webhook configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const webhookConfig = webhookConfigSchema.parse(body);

    const result = await db.query(
      `INSERT INTO webhooks 
      (name, webhook_type, target_url, secret_key, is_active, retry_count, timeout_seconds, headers, filters, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        webhookConfig.name,
        webhookConfig.webhook_type,
        webhookConfig.target_url,
        webhookConfig.secret_key || null,
        webhookConfig.is_active,
        webhookConfig.retry_count,
        webhookConfig.timeout_seconds,
        JSON.stringify(webhookConfig.headers || {}),
        JSON.stringify(webhookConfig.filters || {}),
      ]
    );

    const webhook = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        message: 'Webhook configuration created successfully',
        data: {
          ...webhook,
          secret_key: webhook.secret_key ? '***' : null,
        },
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Create webhook error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook configuration', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}
