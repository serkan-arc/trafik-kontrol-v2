import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * POST /api/webhooks/:id/test
 * Test webhook by sending a test payload
 */

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const webhookId = parseInt(id);

    if (isNaN(webhookId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook ID' },
        { status: 400 }
      );
    }

    // Get webhook config
    const webhookResult = await db.query(
      `SELECT * FROM webhooks WHERE id = $1`,
      [webhookId]
    );

    if (webhookResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found' },
        { status: 404 }
      );
    }

    const webhook = webhookResult.rows[0];

    // Create test payload based on webhook type
    let testPayload: any;
    
    switch (webhook.webhook_type) {
      case 'lead-created':
        testPayload = {
          name: 'Test Lead',
          phone: '5551234567',
          email: 'test@example.com',
          source_system: 'webhook_test',
          test_mode: true,
        };
        break;
      case 'lead-updated':
        testPayload = {
          lead_id: 1,
          status: 'contacted',
          source_system: 'webhook_test',
          test_mode: true,
        };
        break;
      case 'network-callback':
        testPayload = {
          network_id: 1,
          callback_type: 'status_update',
          status: 'contacted',
          test_mode: true,
        };
        break;
      default:
        testPayload = {
          message: 'Test webhook',
          test_mode: true,
          timestamp: new Date().toISOString(),
        };
    }

    // Send test webhook
    const startTime = Date.now();
    let testResult: any = {
      success: false,
      status_code: 0,
      response: null,
      error: null,
      duration_ms: 0,
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Test-Webhook': 'true',
        ...(webhook.headers || {}),
      };

      const response = await fetch(webhook.target_url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(webhook.timeout_seconds * 1000),
      });

      testResult.status_code = response.status;
      testResult.success = response.ok;
      testResult.response = await response.text();
      testResult.duration_ms = Date.now() - startTime;

    } catch (error: any) {
      testResult.error = error.message;
      testResult.duration_ms = Date.now() - startTime;
    }

    // Log test result
    await db.query(
      `INSERT INTO webhook_logs 
      (webhook_type, source_system, payload, status, response, error_message, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        webhook.webhook_type,
        'webhook_test',
        JSON.stringify(testPayload),
        testResult.success ? 'success' : 'failed',
        testResult.response,
        testResult.error,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Webhook test completed',
      data: {
        webhook_id: webhookId,
        webhook_name: webhook.name,
        target_url: webhook.target_url,
        test_payload: testPayload,
        test_result: testResult,
      },
    });

  } catch (error: any) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test webhook', message: error.message },
      { status: 500 }
    );
  }
}
