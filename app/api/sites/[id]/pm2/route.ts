// Station 2: PM2 Control API
// Manage PM2 processes for deployed sites

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PM2Manager } from '@/lib/pm2-manager';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sites/[id]/pm2
 * Get PM2 process status for a site
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get site information
    const siteResult = await db.query(
      'SELECT name, pm2_processes FROM deployed_sites WHERE id = $1',
      [id]
    );

    if (siteResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Site not found'
        },
        { status: 404 }
      );
    }

    const site = siteResult.rows[0];
    const siteName = site.name.replace(/\s+/g, '-').toLowerCase();

    // Get all PM2 processes for this site
    const allProcesses = await PM2Manager.listProcesses();
    // Check both exact match and with suffixes (clean, gray, aggressive)
    // Also check for partial matches (e.g., traffic-control for traffic-control-system)
    const siteProcesses = allProcesses.filter(p => {
      const processName = p.name.toLowerCase();
      const siteNameLower = siteName.toLowerCase();
      const originalName = site.name.toLowerCase();
      
      return processName === siteNameLower || 
             processName === originalName ||
             processName.startsWith(`${siteNameLower}-`) ||
             processName.startsWith(`${originalName}-`) ||
             // Check if site name contains process name (for traffic-control-system -> traffic-control)
             siteNameLower.includes(processName.replace(/-/g, '')) ||
             originalName.includes(processName.replace(/-/g, '')) ||
             // Special case for traffic-control
             (originalName.includes('traffic-control') && processName === 'traffic-control');
    });

    return NextResponse.json({
      success: true,
      data: {
        siteName,
        processes: siteProcesses,
        savedProcesses: site.pm2_processes
      }
    });
  } catch (error: any) {
    console.error('Error fetching PM2 status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PM2 status',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sites/[id]/pm2
 * Control PM2 processes (start, stop, restart)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body; // 'start', 'stop', 'restart', 'delete'

    if (!action || !['start', 'stop', 'restart', 'delete'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be one of: start, stop, restart, delete'
        },
        { status: 400 }
      );
    }

    // Get site information
    const siteResult = await db.query(
      'SELECT name, file_path, site_type, clean_port, gray_port, aggr_port FROM deployed_sites WHERE id = $1',
      [id]
    );

    if (siteResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Site not found'
        },
        { status: 404 }
      );
    }

    const site = siteResult.rows[0];
    const siteName = site.name.replace(/\s+/g, '-').toLowerCase();
    let result;

    switch (action) {
      case 'start':
        // Start all versions
        const versions: any = {};
        
        if (site.clean_port) {
          versions.clean = {
            port: site.clean_port,
            script: site.site_type === 'nextjs' ? 'npm start' : 'node server.js'
          };
        }

        if (site.gray_port) {
          versions.gray = {
            port: site.gray_port,
            script: site.site_type === 'nextjs' ? 'npm start' : 'node server.js'
          };
        }

        if (site.aggr_port) {
          versions.aggressive = {
            port: site.aggr_port,
            script: site.site_type === 'nextjs' ? 'npm start' : 'node server.js'
          };
        }

        result = await PM2Manager.startSiteVersions(siteName, site.file_path, versions);
        
        if (result.success) {
          await db.query(
            'UPDATE deployed_sites SET status = $1, pm2_processes = $2 WHERE id = $3',
            ['active', JSON.stringify(result.processes), id]
          );
        }
        break;

      case 'stop':
        result = await PM2Manager.stopSiteVersions(siteName);
        
        if (result.success) {
          await db.query(
            'UPDATE deployed_sites SET status = $1 WHERE id = $2',
            ['stopped', id]
          );
        }
        break;

      case 'restart':
        result = await PM2Manager.restartSiteVersions(siteName);
        break;

      case 'delete':
        result = await PM2Manager.deleteSiteVersions(siteName);
        
        if (result.success) {
          await db.query(
            'UPDATE deployed_sites SET status = $1, pm2_processes = NULL WHERE id = $2',
            ['stopped', id]
          );
        }
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action'
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      action
    });

  } catch (error: any) {
    console.error('Error controlling PM2:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to control PM2 processes',
        message: error.message
      },
      { status: 500 }
    );
  }
}
