import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import crypto from 'crypto';

/**
 * POST /api/auth/forgot-password
 * 
 * Şifre sıfırlama talebi:
 * - Email ile reset token oluşturma
 * - Token expiry (1 saat)
 * - Email gönderme (simulated - production'da email service kullan)
 * - Rate limiting (5 dakikada bir)
 * 
 * Request Body:
 * {
 *   "email": "string (required)"
 * }
 */

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // 1. Find user by email
    const userResult = await db.query(
      `SELECT id, name, email, is_active FROM users WHERE email = $1`,
      [email]
    );

    // Security: Always return success even if user not found (prevent email enumeration)
    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If this email exists, a password reset link has been sent.',
        note: 'Please check your email inbox and spam folder.',
      });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json({
        success: true,
        message: 'If this email exists, a password reset link has been sent.',
      });
    }

    // 2. Check rate limiting (prevent abuse)
    const recentTokenResult = await db.query(
      `SELECT created_at FROM password_reset_tokens 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [user.id]
    );

    if (recentTokenResult.rows.length > 0) {
      const lastTokenTime = new Date(recentTokenResult.rows[0].created_at);
      const now = new Date();
      const minutesSinceLastToken = (now.getTime() - lastTokenTime.getTime()) / 1000 / 60;

      if (minutesSinceLastToken < 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many requests',
            message: 'Please wait 5 minutes before requesting another password reset.',
            retry_after_seconds: Math.ceil((5 - minutesSinceLastToken) * 60),
          },
          { status: 429 } // Too Many Requests
        );
      }
    }

    // 3. Generate reset token (cryptographically secure)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 4. Save token to database
    await db.query(
      `INSERT INTO password_reset_tokens 
      (user_id, token_hash, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())`,
      [user.id, hashedToken, expiresAt]
    );

    // 5. Log activity
    await db.query(
      `INSERT INTO user_activities 
      (user_id, activity_type, description, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [
        user.id,
        'password_reset_requested',
        'Password reset requested',
        JSON.stringify({
          request_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          expires_at: expiresAt,
        }),
      ]
    );

    // 6. Generate reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://trafik.dtektracking.com'}/reset-password?token=${resetToken}`;

    // 7. Send email (simulated - in production use email service like SendGrid, AWS SES, etc.)
    console.log('=== PASSWORD RESET EMAIL ===');
    console.log(`To: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log('===========================');

    // In production, replace console.log with actual email sending:
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Password Reset Request - DTekTracking',
    //   html: `
    //     <h2>Hello ${user.name},</h2>
    //     <p>You requested a password reset. Click the link below to reset your password:</p>
    //     <a href="${resetLink}">Reset Password</a>
    //     <p>This link expires in 1 hour.</p>
    //     <p>If you didn't request this, please ignore this email.</p>
    //   `
    // });

    return NextResponse.json({
      success: true,
      message: 'If this email exists, a password reset link has been sent.',
      note: 'Please check your email inbox and spam folder.',
      // For development/testing only - remove in production:
      dev_info: process.env.NODE_ENV === 'development' ? {
        reset_token: resetToken,
        reset_link: resetLink,
        expires_at: expiresAt,
      } : undefined,
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process password reset request',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
