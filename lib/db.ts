import { Pool, QueryResult, QueryResultRow } from 'pg'

let poolInstance: Pool | null = null

// Lazy initialization of pool to avoid build-time errors
function getPool(): Pool {
  if (!poolInstance) {
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
    if (!connectionString) {
      throw new Error('Database connection string not configured')
    }
    poolInstance = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return poolInstance
}

// Main query function compatible with Vercel Postgres types
export async function query<T extends QueryResultRow = any>(
  text: string, 
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool()
  try {
    const result = await pool.query<T>(text, params)
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Export as db for backward compatibility
export const db = {
  query,
  close: async () => {
    if (poolInstance) {
      await poolInstance.end()
      poolInstance = null
    }
  }
}

// Default export for backward compatibility
export default db
