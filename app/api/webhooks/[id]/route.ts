import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * DELETE /api/webhooks/:id
 * Delete webhook configuration
 */

export async function DELETE(
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

    // Check if webhook exists
    const checkResult = await db.query(
      `SELECT id, name FROM webhooks WHERE id = $1`,
      [webhookId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Delete webhook
    await db.query(
      `DELETE FROM webhooks WHERE id = $1`,
      [webhookId]
    );

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
      data: {
        id: webhookId,
        name: checkResult.rows[0].name,
        deleted_at: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Delete webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
