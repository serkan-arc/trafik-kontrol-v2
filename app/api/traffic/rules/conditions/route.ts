import { NextResponse } from 'next/server';
import { getAvailableConditions } from '@/lib/traffic/rules-helpers';

/**
 * GET /api/traffic/rules/conditions
 * Get available condition fields, operators, and actions for rule builder
 */
export async function GET() {
  try {
    const conditions = getAvailableConditions();

    return NextResponse.json({
      success: true,
      data: conditions,
      meta: {
        total_fields: conditions.fields.length,
        total_actions: conditions.actions.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching available conditions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch available conditions',
      message: error.message
    }, { status: 500 });
  }
}
