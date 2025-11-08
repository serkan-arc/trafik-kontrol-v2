import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Mark as false positive
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string; id: string }> }
) {
  try {
    const { domain, id } = await context.params
    
    // Get domain info
    const domainResult = await db.query(
      'SELECT * FROM master_domains WHERE domain = $1',
      [domain]
    )
    
    if (!domainResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }
    
    const schema = domainResult.rows[0].db_schema
    
    // Increment false positive count
    const result = await db.query(`
      UPDATE "${schema}_spam_patterns"
      SET false_positive_count = false_positive_count + 1,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Spam pattern not found' },
        { status: 404 }
      )
    }
    
    // If false positive count is high, consider auto-disabling
    if (result.rows[0].false_positive_count > 10 && result.rows[0].matches_count > 0) {
      const falsePositiveRate = result.rows[0].false_positive_count / result.rows[0].matches_count
      
      if (falsePositiveRate > 0.3) {
        // More than 30% false positive rate, auto-disable
        await db.query(`
          UPDATE "${schema}_spam_patterns"
          SET enabled = false,
              updated_at = NOW()
          WHERE id = $1
        `, [id])
        
        return NextResponse.json({
          success: true,
          pattern: { ...result.rows[0], enabled: false },
          message: 'Pattern auto-disabled due to high false positive rate'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      pattern: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error marking false positive:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}