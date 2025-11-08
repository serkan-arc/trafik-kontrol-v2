/**
 * Logout API Route
 * POST /api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/authentication/auth.service';

export async function POST(request: NextRequest) {
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

    // Verify token and get user ID
    const payload = await AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid token'
        },
        { status: 401 }
      );
    }

    // Logout user
    const result = await AuthService.logout(payload.userId);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: 'Logout failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Logout successful'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout route error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
