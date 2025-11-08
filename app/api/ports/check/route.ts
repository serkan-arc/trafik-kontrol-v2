// API: Check port availability
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '@/lib/db';

const execAsync = promisify(exec);

interface PortInfo {
  port: number;
  status: 'available' | 'in-use';
  site_name?: string;
  process_name?: string;
  pid?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = parseInt(searchParams.get('start') || '3000');
    const end = parseInt(searchParams.get('end') || '3050');

    if (start < 1 || end > 65535 || start > end) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid port range. Start must be 1-65535 and start <= end'
        },
        { status: 400 }
      );
    }

    // Get all sites with their ports from database
    const sitesResult = await db.query(
      `SELECT id, name, clean_port, gray_port, aggr_port, 
              mobile_clean_port, mobile_gray_port, mobile_aggr_port, status
       FROM deployed_sites
       WHERE status != 'deleted'`
    );

    // Build map of used ports
    const usedPortsMap = new Map<number, { site_name: string; process_name: string }>();
    
    // Add reserved system ports
    const reservedPorts = [
      { port: 3001, name: 'Traffic Control System', process: 'traffic-control' },
      { port: 9000, name: 'FileBrowser', process: 'filebrowser' },
      { port: 80, name: 'HTTP', process: 'nginx' },
      { port: 443, name: 'HTTPS', process: 'nginx' },
      { port: 22, name: 'SSH', process: 'sshd' },
      { port: 3306, name: 'MySQL', process: 'mysql' },
      { port: 5432, name: 'PostgreSQL', process: 'postgres' }
    ];
    
    reservedPorts.forEach(reserved => {
      if (reserved.port >= start && reserved.port <= end) {
        usedPortsMap.set(reserved.port, {
          site_name: reserved.name,
          process_name: reserved.process
        });
      }
    });
    
    sitesResult.rows.forEach((site: any) => {
      if (site.clean_port) {
        usedPortsMap.set(site.clean_port, {
          site_name: site.name,
          process_name: `${site.name}-clean`
        });
      }
      if (site.gray_port) {
        usedPortsMap.set(site.gray_port, {
          site_name: site.name,
          process_name: `${site.name}-gray`
        });
      }
      if (site.aggr_port) {
        usedPortsMap.set(site.aggr_port, {
          site_name: site.name,
          process_name: `${site.name}-aggressive`
        });
      }
      if (site.mobile_clean_port) {
        usedPortsMap.set(site.mobile_clean_port, {
          site_name: site.name,
          process_name: `${site.name}-mobile-clean`
        });
      }
      if (site.mobile_gray_port) {
        usedPortsMap.set(site.mobile_gray_port, {
          site_name: site.name,
          process_name: `${site.name}-mobile-gray`
        });
      }
      if (site.mobile_aggr_port) {
        usedPortsMap.set(site.mobile_aggr_port, {
          site_name: site.name,
          process_name: `${site.name}-mobile-aggressive`
        });
      }
    });

    // Check system-level port usage with netstat/ss
    let systemPorts: Set<number> = new Set();
    try {
      const { stdout } = await execAsync('ss -tulpn | grep LISTEN || netstat -tulpn | grep LISTEN || true');
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const match = line.match(/:(\d+)\s/);
        if (match) {
          const port = parseInt(match[1]);
          if (port >= start && port <= end) {
            systemPorts.add(port);
          }
        }
      }
    } catch (error) {
      console.warn('Could not check system ports:', error);
    }

    // Build result for requested range
    const ports: PortInfo[] = [];
    
    for (let port = start; port <= end; port++) {
      const dbInfo = usedPortsMap.get(port);
      const isSystemUsed = systemPorts.has(port);
      
      if (dbInfo) {
        // Port is registered in database
        ports.push({
          port,
          status: 'in-use',
          site_name: dbInfo.site_name,
          process_name: dbInfo.process_name
        });
      } else if (isSystemUsed) {
        // Port is in use by system but not in our database
        ports.push({
          port,
          status: 'in-use',
          site_name: 'Unknown',
          process_name: 'System Process'
        });
      } else {
        // Port is available
        ports.push({
          port,
          status: 'available'
        });
      }
    }

    // Calculate statistics
    const available = ports.filter(p => p.status === 'available').length;
    const inUse = ports.filter(p => p.status === 'in-use').length;

    return NextResponse.json({
      success: true,
      ports,
      stats: {
        total: ports.length,
        available,
        inUse,
        nextAvailable: ports.find(p => p.status === 'available')?.port || null
      }
    });
  } catch (error: any) {
    console.error('Error checking ports:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check ports',
        message: error.message
      },
      { status: 500 }
    );
  }
}
