const { Client } = require('pg');

async function checkColumns() {
    const pgClient = new Client({
        host: 'postgres.dtekai.com',
        port: 5432,
        database: 'dtektracking',
        user: 'postgres',
        password: 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s'
    });

    try {
        await pgClient.connect();
        
        // Get column info
        const result = await pgClient.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        `);
        
        console.log('USERS tablosu kolonları:');
        result.rows.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });
        
        await pgClient.end();
    } catch (error) {
        console.error('Hata:', error.message);
    }
}

checkColumns();
