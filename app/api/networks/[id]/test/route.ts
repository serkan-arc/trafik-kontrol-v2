/**
 * Network Test Connection API
 * POST /api/networks/:id/test - Test webhook/API connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/networks/:id/test
 * Test network's webhook URL and API token connectivity
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
          message: 'Invalid network ID',
        },
        { status: 400 }
      );
    }

    // Get network details
    const networkResult = await db.query(
      `SELECT id, name, webhook_url, api_token, status 
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

    // Check if network has webhook configuration
    if (!network.webhook_url) {
      return NextResponse.json(
        {
          success: false,
          message: 'Network does not have a webhook URL configured',
          test_results: {
            webhook_configured: false,
            api_token_configured: !!network.api_token,
          },
        },
        { status: 400 }
      );
    }

    // Test webhook connection
    const testStartTime = Date.now();
    let webhookStatus = {
      success: false,
      status_code: 0,
      response_time_ms: 0,
      error: null as string | null,
      response_body: null as any,
    };

    try {
      // Prepare test payload
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'DTekTracking webhook test',
        network_id: network.id,
        network_name: network.name,
      };

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'DTekTracking/1.0',
      };

      // Add API token if configured
      if (network.api_token) {
        headers['Authorization'] = `Bearer ${network.api_token}`;
      }

      // Make test request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(network.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      webhookStatus.response_time_ms = Date.now() - testStartTime;
      webhookStatus.status_code = response.status;

      // Try to parse response body
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        webhookStatus.response_body = await response.json();
      } else {
        const text = await response.text();
        webhookStatus.response_body = text.substring(0, 500); // Limit text length
      }

      // Consider 2xx status codes as success
      webhookStatus.success = response.status >= 200 && response.status < 300;

      if (!webhookStatus.success) {
        webhookStatus.error = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error: any) {
      webhookStatus.response_time_ms = Date.now() - testStartTime;
      webhookStatus.success = false;

      if (error.name === 'AbortError') {
        webhookStatus.error = 'Request timeout (>10s)';
      } else if (error.cause?.code === 'ENOTFOUND') {
        webhookStatus.error = 'DNS resolution failed - hostname not found';
      } else if (error.cause?.code === 'ECONNREFUSED') {
        webhookStatus.error = 'Connection refused - server not responding';
      } else if (error.cause?.code === 'ECONNRESET') {
        webhookStatus.error = 'Connection reset by peer';
      } else {
        webhookStatus.error = error.message || 'Unknown error';
      }
    }

    // Log the test result
    await db.query(
      `INSERT INTO network_test_logs (
        network_id, test_type, success, status_code, 
        response_time_ms, error_message, tested_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        id,
        'webhook',
        webhookStatus.success,
        webhookStatus.status_code || null,
        webhookStatus.response_time_ms,
        webhookStatus.error || null,
      ]
    ).catch(err => {
      // Log table might not exist yet, ignore error
      console.warn('Could not log test result:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Network connection test completed',
      network: {
        id: network.id,
        name: network.name,
        status: network.status,
      },
      test_results: {
        webhook: {
          url: network.webhook_url,
          configured: true,
          test_status: webhookStatus.success ? 'passed' : 'failed',
          status_code: webhookStatus.status_code || null,
          response_time_ms: webhookStatus.response_time_ms,
          error: webhookStatus.error,
        },
        api_token: {
          configured: !!network.api_token,
          included_in_test: !!network.api_token,
        },
        overall_status: webhookStatus.success ? 'healthy' : 'unhealthy',
      },
    });
  } catch (error) {
    console.error('Network test error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error testing network connection',
      },
      { status: 500 }
    );
  }
}
