/**
 * Inject Tracking Script API
 * POST /api/sites/:id/inject-tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { injectTrackingIntoDirectory } from '@/lib/html-injector';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get site information
    const siteResult = await db.query(
      'SELECT * FROM deployed_sites WHERE id = $1',
      [id]
    );

    if (siteResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Site not found'
        },
        { status: 404 }
      );
    }

    const site = siteResult.rows[0];

    // Inject tracking
    const result = await injectTrackingIntoDirectory(
      site.file_path,
      id,
      'http://207.180.204.60:3500'
    );

    return NextResponse.json({
      success: true,
      message: 'Tracking scripts injected',
      result
    });
  } catch (error: any) {
    console.error('Error injecting tracking:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to inject tracking',
        message: error.message
      },
      { status: 500 }
    );
  }
}
