import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * POST /api/auth/register
 * 
 * Yeni kullanıcı kaydı:
 * - Self-registration veya admin tarafından kayıt
 * - Email uniqueness check
 * - Password hashing
 * - Optional email verification
 * - Auto-login after registration
 * 
 * Request Body:
 * {
 *   "name": "string (required)",
 *   "email": "string (required)",
 *   "password": "string (required, min 8 chars)",
 *   "password_confirm": "string (required)",
 *   "phone": "string (optional)",
 *   "company": "string (optional)",
 *   "role": "agent|viewer (optional, default: agent)"
 * }
 * 
 * Note: Admin role can only be assigned by existing admin users
 */

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirm: z.string().min(8),
  phone: z.string().optional(),
  company: z.string().optional(),
  role: z.enum(['agent', 'viewer']).optional().default('agent'), // Admin cannot self-register
}).refine(data => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ['password_confirm'],
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userData = registerSchema.parse(body);

    // 1. Check if email already exists
    const existingUser = await db.query(
      `SELECT id, email FROM users WHERE email = $1`,
      [userData.email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already registered',
          message: 'An account with this email already exists. Please login or use forgot password.',
        },
        { status: 409 } // Conflict
      );
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // 3. Create user
    const result = await db.query(
      `INSERT INTO users 
      (name, email, password, phone, role, is_active, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, name, email, phone, role, is_active, created_at`,
      [
        userData.name,
        userData.email,
        hashedPassword,
        userData.phone || null,
        userData.role,
        true, // Auto-activate
        false, // Email verification pending (can be implemented later)
      ]
    );

    const newUser = result.rows[0];

    // 4. Generate JWT token (auto-login)
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Log registration activity
    await db.query(
      `INSERT INTO user_activities 
      (user_id, activity_type, description, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [
        newUser.id,
        'user_registered',
        `New user registered: ${newUser.name} (${newUser.email})`,
        JSON.stringify({
          role: newUser.role,
          company: userData.company,
          registration_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        }),
      ]
    );

    // Response
    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role,
            is_active: newUser.is_active,
            created_at: newUser.created_at,
          },
          token: token,
          expires_in: '7 days',
        },
        note: 'You are now logged in. Please verify your email address.',
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid registration data',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Registration failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
