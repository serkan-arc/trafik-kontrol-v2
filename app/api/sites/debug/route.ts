import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/sites/debug
 * Debug endpoint to see PM2 processes and port mappings
 */
export async function GET(request: NextRequest) {
  try {
    const pm2Processes: any[] = [];
    const portMappings: any[] = [];
    let infrastructureServicesCount = 0;

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

    // Load infrastructure services from SYSTEM_CONFIG.json
    try {
      const configPath = path.join(process.cwd(), '..', 'webapp', 'SYSTEM_CONFIG.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);
        const infrastructureServices = config.services || {};
        infrastructureServicesCount = Object.keys(infrastructureServices).length;

        // Add infrastructure services to port mappings first
        for (const [serviceName, service] of Object.entries(infrastructureServices) as [string, any][]) {
          if (service.port) {
            // Find which PM2 process or PID uses this port
            let pm2_process: string | null = null;
            let pid: number | null = null;

            // Check lsof for this port
            try {
              const lsofOutput = execSync(`sudo lsof -i :${service.port} -t 2>/dev/null || echo ""`, { encoding: 'utf-8' }).trim();
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

            portMappings.push({
              port: service.port,
              pm2_process: pm2_process,
              pid: pid,
              site_domain: service.domain,
              service_type: service.type || 'infrastructure',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading SYSTEM_CONFIG.json:', error);
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

      // Check if this port is already added (from infrastructure)
      const existingMapping = portMappings.find(m => m.port === port);
      if (!existingMapping) {
        portMappings.push({
          port: port,
          pm2_process: pm2_process,
          pid: pid,
          site_domain: site.domain,
          service_type: 'deployed_site',
        });
      }
    }

    // Sort port mappings by port number
    portMappings.sort((a, b) => a.port - b.port);

    return NextResponse.json({
      success: true,
      pm2_processes: pm2Processes,
      port_mappings: portMappings,
      total_sites: sites.length,
      total_pm2_processes: pm2Processes.length,
      infrastructure_services: infrastructureServicesCount,
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
