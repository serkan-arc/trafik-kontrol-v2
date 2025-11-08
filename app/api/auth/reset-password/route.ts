import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * POST /api/auth/reset-password
 * 
 * Şifre sıfırlama onayı:
 * - Token validation
 * - Token expiry check
 * - New password setting
 * - Token invalidation
 * - Auto-login option
 * 
 * Request Body:
 * {
 *   "token": "string (required)",
 *   "password": "string (required, min 8 chars)",
 *   "password_confirm": "string (required)"
 * }
 */

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirm: z.string().min(8),
}).refine(data => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ['password_confirm'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // 1. Hash the provided token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find valid token
    const tokenResult = await db.query(
      `SELECT 
        prt.id as token_id,
        prt.user_id,
        prt.expires_at,
        prt.used_at,
        u.id as user_id,
        u.name,
        u.email,
        u.is_active
      FROM password_reset_tokens prt
      JOIN users u ON u.id = prt.user_id
      WHERE prt.token_hash = $1
      ORDER BY prt.created_at DESC
      LIMIT 1`,
      [hashedToken]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid reset token',
          message: 'This password reset link is invalid or has expired.',
        },
        { status: 400 }
      );
    }

    const tokenData = tokenResult.rows[0];

    // 3. Check if token already used
    if (tokenData.used_at) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token already used',
          message: 'This password reset link has already been used. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // 4. Check if token expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token expired',
          message: 'This password reset link has expired. Please request a new one.',
          expired_at: expiresAt.toISOString(),
        },
        { status: 400 }
      );
    }

    // 5. Check if user is active
    if (!tokenData.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account inactive',
          message: 'This account is not active. Please contact support.',
        },
        { status: 403 }
      );
    }

    // 6. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Update user password
    await db.query(
      `UPDATE users 
       SET password = $1, updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, tokenData.user_id]
    );

    // 8. Mark token as used
    await db.query(
      `UPDATE password_reset_tokens 
       SET used_at = NOW()
       WHERE id = $1`,
      [tokenData.token_id]
    );

    // 9. Invalidate all other unused tokens for this user (security)
    await db.query(
      `UPDATE password_reset_tokens 
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL AND id != $2`,
      [tokenData.user_id, tokenData.token_id]
    );

    // 10. Log activity
    await db.query(
      `INSERT INTO user_activities 
      (user_id, activity_type, description, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [
        tokenData.user_id,
        'password_reset_completed',
        'Password successfully reset',
        JSON.stringify({
          reset_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          reset_at: now.toISOString(),
        }),
      ]
    );

    // Optional: Send confirmation email
    console.log('=== PASSWORD RESET CONFIRMATION ===');
    console.log(`User: ${tokenData.name} (${tokenData.email})`);
    console.log(`Password successfully reset at: ${now.toISOString()}`);
    console.log('===================================');

    return NextResponse.json({
      success: true,
      message: 'Password reset successful',
      data: {
        user: {
          name: tokenData.name,
          email: tokenData.email,
        },
        reset_at: now.toISOString(),
      },
      note: 'You can now login with your new password.',
    });

  } catch (error: any) {
    console.error('Reset password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset password',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
