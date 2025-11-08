import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'local'}` });

// Database connection configuration with security
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dtektracking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  max: 20, // maximum number of connections
  min: 5,  // minimum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : false,
};

// Validate database configuration
export function validateDatabaseConfig(): void {
  if (!dbConfig.password) {
    throw new Error('Database password is not configured!');
  }
  
  if (process.env.NODE_ENV === 'production') {
    // Production-specific validations
    if (dbConfig.password.length < 20) {
      throw new Error('Database password is too weak for production!');
    }
    
    if (!dbConfig.ssl) {
      console.warn('⚠️  SSL is recommended for production database connections');
    }
  }
}

// Create connection pool with error handling
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    validateDatabaseConfig();
    pool = new Pool(dbConfig);
    
    // Error handling for pool
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
      process.exit(-1);
    });
    
    pool.on('connect', () => {
      console.log('✅ Database pool connected successfully');
    });
  }
  
  return pool;
}

// Graceful shutdown
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}