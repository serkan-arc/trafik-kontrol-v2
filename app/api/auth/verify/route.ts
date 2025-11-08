/**
 * Verify Token API Route
 * GET /api/auth/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/authentication/auth.service';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: 'No token provided'
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = await AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired token'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Token is valid',
        user: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify token route error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
