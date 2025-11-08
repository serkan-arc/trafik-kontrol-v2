import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { execSync } from 'child_process';

/**
 * GET /api/sites/debug
 * Debug endpoint to see PM2 processes and port mappings
 */
export async function GET(request: NextRequest) {
  try {
    const pm2Processes: any[] = [];
    const portMappings: any[] = [];

    // Get PM2 process list
    try {
      const pm2Output = execSync('pm2 jlist', { encoding: 'utf-8' });
      const processes = JSON.parse(pm2Output);

      for (const proc of processes) {
        const port = proc.pm2_env?.PORT || proc.pm2_env?.port;
        
        pm2Processes.push({
          pm_id: proc.pm_id,
          name: proc.name,
          pid: proc.pid,
          status: proc.pm2_env?.status || 'unknown',
          port: port || null,
          memory: proc.monit?.memory || 0,
          cpu: proc.monit?.cpu || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching PM2 list:', error);
    }

    // Get sites from database
    const sitesResult = await db.query(
      'SELECT id, name, domain, clean_port, pm2_name, pm2_id, status FROM deployed_sites ORDER BY deployed_at DESC'
    );

    const sites = sitesResult.rows;

    // Create port mappings
    for (const site of sites) {
      const port = site.clean_port;
      
      // Find which PM2 process uses this port
      let pm2_process: string | null = null;
      let pid: number | null = null;

      // Method 1: Check lsof
      try {
        const lsofOutput = execSync(`sudo lsof -i :${port} -t 2>/dev/null || echo ""`, { encoding: 'utf-8' }).trim();
        if (lsofOutput) {
          pid = parseInt(lsofOutput.split('\n')[0]);
          
          // Find PM2 process with this PID
          const matchingProc = pm2Processes.find(p => p.pid === pid);
          if (matchingProc) {
            pm2_process = matchingProc.name;
          }
        }
      } catch (e) {
        // lsof failed
      }

      // Method 2: Check by PM2 name in database
      if (!pm2_process && site.pm2_name) {
        const matchingProc = pm2Processes.find(p => p.name === site.pm2_name);
        if (matchingProc) {
          pm2_process = matchingProc.name;
          pid = matchingProc.pid;
        }
      }

      portMappings.push({
        port: port,
        pm2_process: pm2_process,
        pid: pid,
        site_domain: site.domain,
      });
    }

    return NextResponse.json({
      success: true,
      pm2_processes: pm2Processes,
      port_mappings: portMappings,
      total_sites: sites.length,
      total_pm2_processes: pm2Processes.length,
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch debug info',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
