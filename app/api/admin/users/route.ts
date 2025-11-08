import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/users
 * List all users with pagination and filtering
 * 
 * POST /api/admin/users
 * Create new user (admin only)
 */

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'agent', 'viewer']).default('agent'),
  is_active: z.boolean().optional().default(true),
  phone: z.string().optional(),
});

// GET - List users
export async function GET(request: NextRequest) {
  const client = new Client({
    host: process.env.DB_HOST || 'postgres.dtekai.com',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'dtektracking',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s',
  });

  try {
    await client.connect();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');
    const is_active = searchParams.get('is_active');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`role = $${paramIndex++}`);
      queryParams.push(role);
    }

    if (is_active !== null) {
      whereConditions.push(`is_active = $${paramIndex++}`);
      queryParams.push(is_active === 'true');
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get users - Add first_name and last_name
    queryParams.push(limit, offset);
    const result = await client.query(
      `SELECT 
        id, email, first_name, last_name, role, status, 
        last_login_at, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('List users error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}

// POST - Create user
export async function POST(request: NextRequest) {
  const client = new Client({
    host: process.env.DB_HOST || 'postgres.dtekai.com',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'dtektracking',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s',
  });

  try {
    await client.connect();
    
    const body = await request.json();
    // Handle both formats
    const userData = {
      name: body.name || `${body.first_name} ${body.last_name}`.trim(),
      email: body.email,
      password: body.password,
      role: body.role || 'user',
      is_active: body.is_active !== undefined ? body.is_active : true,
      phone: body.phone,
      first_name: body.first_name || body.name?.split(' ')[0],
      last_name: body.last_name || body.name?.split(' ')[1]
    };

    // Check if email already exists
    const existingUser = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [userData.email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const result = await client.query(
      `INSERT INTO users 
      (email, password_hash, first_name, last_name, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, email, first_name, last_name, role, status, created_at`,
      [
        userData.email,
        hashedPassword,
        userData.first_name,
        userData.last_name,
        userData.role,
        'active'
      ]
    );

    const newUser = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        data: newUser,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
