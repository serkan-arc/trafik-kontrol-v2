import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * GET /api/admin/database/backup
 * Trigger database backup (metadata only - actual backup should be done via pg_dump)
 * 
 * This endpoint creates a backup record and returns statistics.
 * In production, this should trigger an actual pg_dump or similar backup process.
 */

export async function GET(request: NextRequest) {
  try {
    // Get database statistics
    const stats = await getDatabaseStats();

    // Create backup record
    const backupRecord = await db.query(
      `INSERT INTO database_backups 
      (backup_date, status, file_size_mb, records_count, created_at)
      VALUES (NOW(), $1, $2, $3, NOW())
      RETURNING *`,
      ['completed', 0, stats.total_records] // file_size_mb would be actual file size in production
    );

    const backup = backupRecord.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Database backup initiated',
      data: {
        backup_id: backup.id,
        backup_date: backup.backup_date,
        status: backup.status,
        statistics: stats,
        note: 'This is a metadata backup record. In production, this should trigger pg_dump or similar backup process.',
      },
    });

  } catch (error: any) {
    console.error('Database backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  const tables = ['leads', 'networks', 'sites', 'campaigns', 'users', 'lead_activities', 'webhook_logs'];
  const stats: any = {
    total_records: 0,
    tables: {},
  };

  for (const table of tables) {
    try {
      const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(result.rows[0].count);
      stats.tables[table] = count;
      stats.total_records += count;
    } catch (error) {
      stats.tables[table] = 0;
    }
  }

  return stats;
}
