/**
 * Master Sync API - Comprehensive PM2 + Nginx + Database Synchronization
 * 
 * GET  /api/sites/sync-master - Generate sync report
 * POST /api/sites/sync-master - Auto-fix issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { SyncManager } from '@/lib/sync-manager';

/**
 * GET - Generate comprehensive sync report
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Master Sync: Generating report...');
    
    const report = await SyncManager.generateSyncReport();

    // Calculate summary statistics
    const summary = {
      totalSites: report.sources.database.length,
      fullySynced: report.crossReference.allSynced.length,
      partiallySynced: report.crossReference.partialSync.length,
      totalOrphans: 
        report.crossReference.orphans.pm2Only.length +
        report.crossReference.orphans.nginxOnly.length +
        report.crossReference.orphans.databaseOnly.length,
      issuesCount: report.issues.length,
      healthScore: Math.round(
        (report.crossReference.allSynced.length / Math.max(report.sources.database.length, 1)) * 100
      )
    };

    return NextResponse.json({
      success: true,
      message: 'Sync report generated successfully',
      summary,
      report,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Master Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate sync report',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Auto-fix sync issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      removeOrphanPM2 = false,
      removeOrphanNginx = false,
      updateDatabaseStatus = true,
      dryRun = false
    } = body;

    console.log('🔧 Master Sync: Auto-fix starting...', { 
      removeOrphanPM2, 
      removeOrphanNginx, 
      updateDatabaseStatus,
      dryRun 
    });

    // Generate report first
    const report = await SyncManager.generateSyncReport();

    // If dry run, just return what would be fixed
    if (dryRun) {
      const wouldFix: string[] = [];

      if (removeOrphanPM2) {
        report.crossReference.orphans.pm2Only.forEach(orphan => {
          wouldFix.push(`Would remove PM2 process: ${orphan.name}`);
        });
      }

      if (removeOrphanNginx) {
        report.crossReference.orphans.nginxOnly.forEach(orphan => {
          wouldFix.push(`Would remove Nginx config: ${orphan.name}`);
        });
      }

      if (updateDatabaseStatus) {
        report.crossReference.partialSync.forEach(site => {
          wouldFix.push(`Would update database status for: ${site.name}`);
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Dry run completed',
        dryRun: true,
        wouldFix,
        report
      });
    }

    // Perform actual fixes
    const result = await SyncManager.autoFixIssues(report, {
      removeOrphanPM2,
      removeOrphanNginx,
      updateDatabaseStatus
    });

    // Generate new report to see results
    const newReport = await SyncManager.generateSyncReport();

    const summary = {
      fixedCount: result.fixed.length,
      errorCount: result.errors.length,
      beforeHealth: Math.round(
        (report.crossReference.allSynced.length / Math.max(report.sources.database.length, 1)) * 100
      ),
      afterHealth: Math.round(
        (newReport.crossReference.allSynced.length / Math.max(newReport.sources.database.length, 1)) * 100
      )
    };

    return NextResponse.json({
      success: true,
      message: 'Auto-fix completed',
      summary,
      fixed: result.fixed,
      errors: result.errors,
      beforeReport: report,
      afterReport: newReport,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Master Sync auto-fix error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Auto-fix failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}
