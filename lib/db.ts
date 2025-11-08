/**
 * Database Connection Module
 * PostgreSQL connection pool for the DTekTracking system
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Singleton pattern for database connection
class Database {
  private static instance: Database;
  private pool: Pool | null = null;

  private constructor() {
    // Pool will be initialized lazily on first use
  }

  private getPool(): Pool {
    if (!this.pool) {
      const password = process.env.DB_PASSWORD || '';
      
      // Ensure password is a string
      if (typeof password !== 'string') {
        throw new Error('DB_PASSWORD must be a string');
      }

      this.pool = new Pool({
        host: process.env.DB_HOST || 'postgres.dtekai.com',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'dtektracking',
        user: process.env.DB_USER || 'postgres',
        password: password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('Unexpected database pool error:', err);
      });
    }
    return this.pool;
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const pool = this.getPool();
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', { text, error });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    const pool = this.getPool();
    return await pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Export singleton instance
export const db = Database.getInstance();

// Default export for backward compatibility
export default db;
