import { NextRequest, NextResponse } from 'next/server';
import { getAllRules, createRule } from '@/lib/traffic/rules-helpers';

/**
 * GET /api/traffic/rules
 * List all auto rules with filtering
 * 
 * Query params:
 *   - enabled: boolean (filter by enabled status)
 *   - action: string (filter by action type)
 *   - page: number (default: 1)
 *   - limit: number (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      enabled: searchParams.get('enabled') === 'true' ? true : 
               searchParams.get('enabled') === 'false' ? false : undefined,
      action: searchParams.get('action') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    };

    const result = await getAllRules(filters);

    return NextResponse.json({
      success: true,
      data: result.rules || [],
      meta: result.meta
    });
  } catch (error: any) {
    console.error('Error fetching rules:', error);
    // Return empty array on error to prevent frontend crashes
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      },
      error: 'Database connection error - returning empty dataset'
    });
  }
}

/**
 * POST /api/traffic/rules
 * Create new auto rule
 * 
 * Body: {
 *   name: string,
 *   description?: string,
 *   conditions: Array<{
 *     field: string,
 *     operator: string,
 *     value: any,
 *     logic?: 'AND' | 'OR'
 *   }>,
 *   action: 'whitelist' | 'graylist' | 'blacklist' | 'notify',
 *   redirect_version?: 'clean' | 'gray' | 'aggressive' | 'forbidden',
 *   priority?: number,
 *   enabled?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.name) {
      return NextResponse.json({
        success: false,
        error: 'name is required'
      }, { status: 400 });
    }

    if (!body.conditions || !Array.isArray(body.conditions) || body.conditions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'conditions array is required and must not be empty'
      }, { status: 400 });
    }

    if (!body.action) {
      return NextResponse.json({
        success: false,
        error: 'action is required'
      }, { status: 400 });
    }

    // Create rule
    const rule = await createRule(body, 'admin-user');

    return NextResponse.json({
      success: true,
      message: 'Rule created successfully',
      data: rule
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating rule:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create rule',
      message: error.message
    }, { status: 500 });
  }
}
