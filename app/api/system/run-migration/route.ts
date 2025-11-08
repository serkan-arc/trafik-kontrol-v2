import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'traffic_control',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export async function POST(request: NextRequest) {
  try {
    const { migration } = await request.json()
    
    if (!migration) {
      return NextResponse.json({
        success: false,
        error: 'Migration filename is required'
      }, { status: 400 })
    }

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', `${migration}.sql`)
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({
        success: false,
        error: `Migration file not found: ${migration}.sql`
      }, { status: 404 })
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Execute migration
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(migrationSQL)
      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: `Migration ${migration} executed successfully`,
        migration: migration
      })
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Migration failed',
      details: error.toString()
    }, { status: 500 })
  }
}

// GET endpoint to list available migrations
export async function GET(request: NextRequest) {
  try {
    const migrationsDir = path.join(process.cwd(), 'migrations')
    
    if (!fs.existsSync(migrationsDir)) {
      return NextResponse.json({
        success: false,
        error: 'Migrations directory not found'
      }, { status: 404 })
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(migrationsDir, file)
        const stats = fs.statSync(filePath)
        return {
          name: file.replace('.sql', ''),
          filename: file,
          size: stats.size,
          modified: stats.mtime
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      success: true,
      migrations: files,
      count: files.length
    })

  } catch (error: any) {
    console.error('Error listing migrations:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
