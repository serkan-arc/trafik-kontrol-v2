import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Client } from 'pg';

const dbConfig = {
  host: process.env.DB_HOST || 'postgres.dtekai.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dtektracking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s',
};

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const client = new Client(dbConfig);
  
  try {
    const { password } = await request.json();
    
    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    await client.connect();

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    const result = await client.query(
      `UPDATE users 
       SET password_hash = $1 
       WHERE id = $2
       RETURNING id, email`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Update password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update password' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}