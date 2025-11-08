import { NextRequest, NextResponse } from 'next/server';
import { validateRuleConfig } from '@/lib/traffic/rules-helpers';

/**
 * POST /api/traffic/rules/validate
 * Validate rule configuration before creation
 * 
 * Body: Partial<Rule> (rule configuration to validate)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateRuleConfig(body);

    if (validation.valid) {
      return NextResponse.json({
        success: true,
        valid: true,
        message: 'Rule configuration is valid'
      });
    } else {
      return NextResponse.json({
        success: true,
        valid: false,
        errors: validation.errors
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error validating rule:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate rule',
      message: error.message
    }, { status: 500 });
  }
}
