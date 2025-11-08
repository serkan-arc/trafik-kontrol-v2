/**
 * Login API Route
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/modules/authentication/auth.service';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Authenticate user
    const result = await AuthService.login(email, password);

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    // Return success with token
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
