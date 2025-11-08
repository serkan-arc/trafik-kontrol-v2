import { NextRequest, NextResponse } from 'next/server';
import { getRuleById, updateRule, deleteRule } from '@/lib/traffic/rules-helpers';

/**
 * GET /api/traffic/rules/[id]
 * Get rule by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id  } = await params;
  
  try {
    const rule = await getRuleById(id);

    return NextResponse.json({
      success: true,
      data: rule
    });
  } catch (error: any) {
    console.error('Error fetching rule:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch rule',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}

/**
 * PATCH /api/traffic/rules/[id]
 * Update rule
 * 
 * Body: Partial<Rule> (any fields to update)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id  } = await params;
  
  try {
    const body = await request.json();

    const updatedRule = await updateRule(id, body);

    return NextResponse.json({
      success: true,
      message: 'Rule updated successfully',
      data: updatedRule
    });
  } catch (error: any) {
    console.error('Error updating rule:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update rule',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}

/**
 * DELETE /api/traffic/rules/[id]
 * Delete rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id  } = await params;
  
  try {
    const result = await deleteRule(id);

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('Error deleting rule:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete rule',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}
