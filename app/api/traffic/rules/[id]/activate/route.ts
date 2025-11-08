import { NextRequest, NextResponse } from 'next/server';
import { updateRule } from '@/lib/traffic/rules-helpers';

/**
 * POST /api/traffic/rules/[id]/activate
 * Activate or deactivate a rule
 * 
 * Body: { enabled: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id  } = await params;
  
  try {
    const body = await request.json();

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'enabled field is required and must be boolean'
      }, { status: 400 });
    }

    const updatedRule = await updateRule(id, { enabled: body.enabled });

    return NextResponse.json({
      success: true,
      message: `Rule ${body.enabled ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: updatedRule.id,
        name: updatedRule.name,
        enabled: updatedRule.enabled
      }
    });
  } catch (error: any) {
    console.error('Error activating/deactivating rule:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update rule status',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}
