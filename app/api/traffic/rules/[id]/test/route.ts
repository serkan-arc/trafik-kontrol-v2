import { NextRequest, NextResponse } from 'next/server';
import { testRule, executeRule } from '@/lib/traffic/rules-helpers';

/**
 * POST /api/traffic/rules/[id]/test
 * Test rule against an IP (simulation or execution)
 * 
 * Body: {
 *   ip: string,
 *   execute?: boolean (default: false, if true will actually execute the rule)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id  } = await params;
  
  try {
    const body = await request.json();

    if (!body.ip) {
      return NextResponse.json({
        success: false,
        error: 'ip is required'
      }, { status: 400 });
    }

    // Test mode (simulation)
    if (!body.execute) {
      const testResult = await testRule(id, body.ip);

      return NextResponse.json({
        success: true,
        mode: 'simulation',
        message: testResult.matches 
          ? `Rule would trigger for IP ${body.ip}` 
          : `Rule would NOT trigger for IP ${body.ip}`,
        data: testResult
      });
    }

    // Execute mode (actual execution)
    const executeResult = await executeRule(id, body.ip, 'admin-user');

    return NextResponse.json({
      success: true,
      mode: 'execution',
      message: executeResult.executed 
        ? `Rule executed successfully for IP ${body.ip}` 
        : executeResult.reason,
      data: executeResult
    });
  } catch (error: any) {
    console.error('Error testing/executing rule:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test/execute rule',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}
