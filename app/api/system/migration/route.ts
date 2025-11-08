import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

// GET - Check migration status
export async function GET() {
  try {
    // Check if master_domains table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'master_domains'
      ) as exists
    `)
    
    console.log('Migration check result:', tableCheck.rows[0])
    const migrationExists = tableCheck.rows[0]?.exists === true
    
    return NextResponse.json({
      success: true,
      migrationApplied: migrationExists,
      message: migrationExists 
        ? 'Multi-domain migration already applied' 
        : 'Multi-domain migration needs to be applied',
      debug: {
        tableCheckResult: tableCheck.rows[0],
        migrationExists
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error: any) {
    console.error('Error checking migration:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST - Apply migration
export async function POST() {
  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '007_multi_domain_support.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    // Split by semicolon but keep statements intact
    const statements = migrationSQL
      .split(/;(?=\s*(?:--|CREATE|ALTER|INSERT|DROP|COMMENT))/g)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + (stmt.trim().endsWith(';') ? '' : ';'))
    
    let successCount = 0
    let errors = []
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue
      
      try {
        await db.query(statement)
        successCount++
      } catch (error: any) {
        // If table/function already exists, it's okay
        if (error.message?.includes('already exists')) {
          successCount++
        } else {
          errors.push({
            statement: statement.substring(0, 100) + '...',
            error: error.message
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully',
      details: {
        totalStatements: statements.length,
        successfulStatements: successCount,
        errors: errors.length > 0 ? errors : null
      }
    })
    
  } catch (error: any) {
    console.error('Error applying migration:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}