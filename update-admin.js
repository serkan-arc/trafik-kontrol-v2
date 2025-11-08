const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: 'postgres.dtekai.com',
  port: 5432,
  database: 'dtektracking',
  user: 'postgres',
  password: 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s'
});

async function updateAdmin() {
  try {
    await client.connect();
    
    // Check if admin exists
    const checkResult = await client.query(
      "SELECT id, email, password_hash FROM users WHERE email = 'serkandogan@aiteldtek.com'"
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Admin user found:', checkResult.rows[0].id);
      
      // Update admin info
      const updateResult = await client.query(
        `UPDATE users SET 
          first_name = 'Serkan',
          last_name = 'Doğan',
          role = 'admin',
          status = 'active'
        WHERE email = 'serkandogan@aiteldtek.com'
        RETURNING *`
      );
      
      console.log('Admin updated successfully');
      console.log('Email: serkandogan@aiteldtek.com');
      console.log('Password: Esvella2025136326.');
      console.log('Role: admin');
      console.log('Full Name: Serkan Doğan');
    } else {
      console.log('Admin user not found, creating...');
      
      const hash = await bcrypt.hash('Esvella2025136326.', 10);
      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, status, created_at)
        VALUES ('serkandogan@aiteldtek.com', $1, 'Serkan', 'Doğan', 'admin', 'active', NOW())
        RETURNING *`,
        [hash]
      );
      
      console.log('Admin created successfully:', insertResult.rows[0].id);
      console.log('Email: serkandogan@aiteldtek.com');
      console.log('Password: Esvella2025136326.');
      console.log('Role: admin');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

updateAdmin();