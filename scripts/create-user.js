#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'local'}` });

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createUser() {
  try {
    // Kullanıcı bilgileri
    const email = 'serkandogan@aiteldtek.com';
    const password = 'Esvella2025136326.';
    const firstName = 'Serkan';
    const lastName = 'Doğan';
    const role = 'admin';

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ User already exists. Updating password...');
      
      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Update existing user
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, 
             first_name = $2, 
             last_name = $3, 
             role = $4,
             status = 'active',
             updated_at = NOW()
         WHERE email = $5`,
        [passwordHash, firstName, lastName, role, email.toLowerCase()]
      );
      
      console.log('✅ User password updated successfully!');
    } else {
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create new user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, 'active', NOW()) 
         RETURNING id`,
        [email.toLowerCase(), passwordHash, role, firstName, lastName]
      );

      console.log('✅ User created successfully!');
      console.log('User ID:', result.rows[0].id);
    }

    console.log('\n📧 Login Credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', role);
    
    // Close connection
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

// First check if users table exists
async function checkAndCreateTable() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )`
    );

    if (!tableCheck.rows[0].exists) {
      console.log('📦 Creating users table...');
      
      // Create users table
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          status VARCHAR(20) DEFAULT 'active',
          last_login_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_status ON users(status);
      `);
      
      console.log('✅ Users table created successfully!');
    }

    // Now create the user
    await createUser();
  } catch (error) {
    console.error('❌ Error in table check:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the script
checkAndCreateTable();