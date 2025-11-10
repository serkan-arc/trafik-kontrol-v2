#!/usr/bin/env node

/**
 * YENİ PARTNER PORTAL KULLANICISI OLUŞTURMA
 * 
 * Kullanım:
 *   node create-portal-user.js BUYER_CODE username password
 * 
 * Örnek:
 *   node create-portal-user.js BUYER_Y ypartner MySecurePass123!
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

async function createPortalUser(buyerCode, username, password) {
  try {
    console.log('🔍 Checking buyer...');
    
    // Check if buyer exists
    const buyerCheck = await pool.query(
      'SELECT id, buyer_code, buyer_name, status FROM buyers WHERE buyer_code = $1',
      [buyerCode]
    );
    
    if (buyerCheck.rows.length === 0) {
      console.error('❌ Buyer not found:', buyerCode);
      console.log('💡 Available buyers:');
      const buyers = await pool.query('SELECT buyer_code, buyer_name FROM buyers ORDER BY buyer_code');
      buyers.rows.forEach(b => console.log(`   - ${b.buyer_code}: ${b.buyer_name}`));
      process.exit(1);
    }
    
    const buyer = buyerCheck.rows[0];
    console.log('✅ Buyer found:', buyer.buyer_name);
    
    if (buyer.status !== 'active') {
      console.warn('⚠️  Warning: Buyer status is not active:', buyer.status);
    }
    
    // Check if username already exists
    console.log('🔍 Checking username availability...');
    const usernameCheck = await pool.query(
      'SELECT buyer_code FROM buyers WHERE dashboard_username = $1',
      [username]
    );
    
    if (usernameCheck.rows.length > 0) {
      console.error('❌ Username already exists:', username);
      console.log('   Used by:', usernameCheck.rows[0].buyer_code);
      process.exit(1);
    }
    
    console.log('✅ Username available');
    
    // Validate password
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }
    
    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = bcrypt.hashSync(password, 10);
    console.log('✅ Password hashed');
    
    // Update buyer with portal access
    console.log('💾 Creating portal access...');
    const result = await pool.query(
      `UPDATE buyers 
       SET 
         dashboard_username = $1,
         dashboard_password = $2,
         portal_active = true,
         updated_at = NOW()
       WHERE buyer_code = $3
       RETURNING buyer_code, buyer_name, dashboard_username, portal_active`,
      [username, hashedPassword, buyerCode]
    );
    
    if (result.rows.length === 0) {
      console.error('❌ Failed to update buyer');
      process.exit(1);
    }
    
    const updated = result.rows[0];
    
    console.log('\n✅ SUCCESS! Portal access created:');
    console.log('════════════════════════════════');
    console.log('Buyer Code:', updated.buyer_code);
    console.log('Buyer Name:', updated.buyer_name);
    console.log('Username:  ', updated.dashboard_username);
    console.log('Password:  ', password);
    console.log('Portal:    ', updated.portal_active ? 'Active ✅' : 'Inactive ❌');
    console.log('════════════════════════════════');
    console.log('\n🌐 Login URL: http://207.180.204.60:3002');
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('💡 Tell the partner to change their password after first login.');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node create-portal-user.js BUYER_CODE username password');
    console.log('');
    console.log('Example:');
    console.log('  node create-portal-user.js BUYER_Y ypartner MySecurePass123!');
    console.log('');
    console.log('Requirements:');
    console.log('  - Buyer must exist in database');
    console.log('  - Username must be unique (min 4 characters)');
    console.log('  - Password must be min 8 characters');
    process.exit(1);
  }
  
  const [buyerCode, username, password] = args;
  
  createPortalUser(buyerCode, username, password);
}

module.exports = { createPortalUser };
