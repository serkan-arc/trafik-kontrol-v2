import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: process.env.DB_HOST || 'postgres.dtekai.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dtektracking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s',
};

// PUT - Update user
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const client = new Client(dbConfig);

  try {
    await client.connect();
    
    const body = await request.json();
    
    // Check if user exists
    const userResult = await client.query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(body.email);
    }

    if (body.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(body.first_name);
    }

    if (body.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(body.last_name);
    }

    if (body.role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(body.role);
    }

    if (body.status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
    }

    if (body.password) {
      const hashedPassword = await bcrypt.hash(body.password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add user ID at the end
    values.push(id);

    const result = await client.query(
      `UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, role, status`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0],
    });

  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Check if user exists
    const userResult = await client.query(
      `SELECT email FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting the main admin
    if (userResult.rows[0].email === 'serkandogan@aiteldtek.com') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the main admin user' },
        { status: 403 }
      );
    }

    // Delete user
    await client.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}