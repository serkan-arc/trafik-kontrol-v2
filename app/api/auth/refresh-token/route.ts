import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

/**
 * POST /api/auth/refresh-token
 * 
 * JWT Token yenileme:
 * - Mevcut token'ı verify et
 * - Yeni token oluştur
 * - Token expiry yenile (7 gün)
 * - User bilgilerini güncelle
 * - Refresh count tracking
 * 
 * Request Body:
 * {
 *   "token": "string (required - current JWT token)"
 * }
 * 
 * Headers:
 * - Authorization: Bearer <token> (alternative to body)
 */

const refreshTokenSchema = z.object({
  token: z.string().min(1, 'Token is required').optional(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token: bodyToken } = refreshTokenSchema.parse(body);

    // Get token from body or Authorization header
    const authHeader = request.headers.get('authorization');
    let token = bodyToken;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token required',
          message: 'Please provide token in request body or Authorization header.',
        },
        { status: 400 }
      );
    }

    // 1. Verify current token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        // Allow refresh of expired tokens (within reasonable time - e.g., 30 days)
        const expiredDecoded: any = jwt.decode(token);
        
        if (!expiredDecoded || !expiredDecoded.exp) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid token',
              message: 'Token is malformed and cannot be refreshed.',
            },
            { status: 401 }
          );
        }

        const expiredAt = new Date(expiredDecoded.exp * 1000);
        const now = new Date();
        const daysSinceExpiry = (now.getTime() - expiredAt.getTime()) / 1000 / 60 / 60 / 24;

        // Only allow refresh if token expired less than 30 days ago
        if (daysSinceExpiry > 30) {
          return NextResponse.json(
            {
              success: false,
              error: 'Token too old',
              message: 'Token has been expired for too long. Please login again.',
            },
            { status: 401 }
          );
        }

        decoded = expiredDecoded;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid token',
            message: error.message,
          },
          { status: 401 }
        );
      }
    }

    // 2. Verify user still exists and is active
    const userResult = await db.query(
      `SELECT id, name, email, role, is_active, last_login_at FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          message: 'User account no longer exists.',
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account inactive',
          message: 'Your account has been deactivated. Please contact support.',
        },
        { status: 403 }
      );
    }

    // 3. Generate new token
    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Update last login time
    await db.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    // 5. Log activity
    await db.query(
      `INSERT INTO user_activities 
      (user_id, activity_type, description, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [
        user.id,
        'token_refreshed',
        'JWT token refreshed',
        JSON.stringify({
          refresh_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        }),
      ]
    );

    // Response
    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          last_login_at: user.last_login_at,
        },
        token: newToken,
        expires_in: '7 days',
        issued_at: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Refresh token error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh token',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
