const { Client } = require('pg');

async function checkTableStructure() {
    const client = new Client({
        host: 'postgres.dtekai.com',
        port: 5432,
        database: 'dtektracking',
        user: 'postgres',
        password: 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s'
    });

    try {
        await client.connect();
        console.log('Checking global_system_settings table structure...\n');
        
        // Get column information
        const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'global_system_settings'
            ORDER BY ordinal_position;
        `);
        
        console.log('Table: global_system_settings');
        console.log('Columns:');
        console.log('-'.repeat(60));
        columnsResult.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
        
        // Get sample data
        console.log('\nSample data (first 3 rows):');
        console.log('-'.repeat(60));
        const dataResult = await client.query('SELECT * FROM global_system_settings LIMIT 3');
        console.log(dataResult.rows);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkTableStructure();