#!/usr/bin/env node

/**
 * ADMIN KULLANICISI OLUŞTURMA (Traffic Control - Port 3001)
 * 
 * Kullanım:
 *   node create-admin-user.js email password firstName lastName role
 * 
 * Örnek:
 *   node create-admin-user.js admin@dtek.com Admin2024! Admin User admin
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'postgres.dtekai.com',
  port: 5432,
  database: 'dtektracking',
  user: 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function createAdminUser(email, password, firstName, lastName, role = 'admin') {
  try {
    console.log('🔍 Checking if users table exists...');
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  users table does not exist. Creating...');
      
      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(50) DEFAULT 'user',
          status VARCHAR(20) DEFAULT 'active',
          last_login_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      `);
      
      console.log('✅ users table created');
    } else {
      console.log('✅ users table exists');
    }
    
    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    const userCheck = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userCheck.rows.length > 0) {
      const existing = userCheck.rows[0];
      console.log('⚠️  User already exists:', existing.email, '-', existing.role);
      console.log('💡 Use different email or update existing user.');
      process.exit(1);
    }
    
    console.log('✅ Email available');
    
    // Validate password
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }
    
    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = bcrypt.hashSync(password, 10);
    console.log('✅ Password hashed');
    
    // Create user
    console.log('💾 Creating admin user...');
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
       RETURNING id, email, role, first_name, last_name, created_at`,
      [email.toLowerCase(), passwordHash, firstName, lastName, role]
    );
    
    const user = result.rows[0];
    
    console.log('\n✅ SUCCESS! Admin user created:');
    console.log('════════════════════════════════');
    console.log('ID:        ', user.id);
    console.log('Email:     ', user.email);
    console.log('Name:      ', `${user.first_name} ${user.last_name}`);
    console.log('Role:      ', user.role);
    console.log('Password:  ', password);
    console.log('Created:   ', user.created_at);
    console.log('════════════════════════════════');
    console.log('\n🌐 Login URL: http://207.180.204.60:3001/login');
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('💡 Change password after first login.');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: node create-admin-user.js email password firstName lastName [role]');
    console.log('');
    console.log('Example:');
    console.log('  node create-admin-user.js admin@dtek.com Admin2024! Admin User admin');
    console.log('');
    console.log('Requirements:');
    console.log('  - Email must be valid and unique');
    console.log('  - Password must be min 6 characters');
    console.log('  - Role: admin, manager, user (default: admin)');
    process.exit(1);
  }
  
  const [email, password, firstName, lastName, role = 'admin'] = args;
  
  createAdminUser(email, password, firstName, lastName, role);
}

module.exports = { createAdminUser };
