import { createPool, QueryResultRow, VercelPool } from '@vercel/postgres'

let poolInstance: VercelPool | null = null

// Lazy initialization of pool to avoid build-time errors
function getPool(): VercelPool {
  if (!poolInstance) {
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
    if (!connectionString) {
      throw new Error('Database connection string not configured')
    }
    poolInstance = createPool({ connectionString })
  }
  return poolInstance
}

// Main query function
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const result = await client.query<T>(text, params)
    return result
  } finally {
    client.release()
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
