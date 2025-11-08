// Nginx Configuration Management API
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

interface NginxSite {
  name: string;
  enabled: boolean;
  domain: string;
  ssl: boolean;
  configPath: string;
  upstream?: string;
  port?: number;
  lastModified?: string;
  size?: string;
}

/**
 * GET /api/nginx
 * Get all nginx configurations
 */
export async function GET(request: NextRequest) {
  try {
    const sites: NginxSite[] = [];
    
    // Get all sites from sites-available
    const availablePath = '/etc/nginx/sites-available';
    const enabledPath = '/etc/nginx/sites-enabled';
    
    // Get list of enabled sites
    const enabledSites = new Set<string>();
    if (fs.existsSync(enabledPath)) {
      const enabledFiles = fs.readdirSync(enabledPath);
      enabledFiles.forEach(file => {
        // Resolve symlink to get actual file name
        try {
          const linkPath = path.join(enabledPath, file);
          const stats = fs.lstatSync(linkPath);
          if (stats.isSymbolicLink()) {
            const target = fs.readlinkSync(linkPath);
            const targetName = path.basename(target);
            enabledSites.add(targetName);
          } else {
            enabledSites.add(file);
          }
        } catch (e) {
          enabledSites.add(file);
        }
      });
    }
    
    // Read all available sites
    if (fs.existsSync(availablePath)) {
      const files = fs.readdirSync(availablePath);
      
      for (const file of files) {
        // Skip default and non-config files
        if (file === 'default' || file.startsWith('.')) continue;
        
        const configPath = path.join(availablePath, file);
        const stats = fs.statSync(configPath);
        
        // Read config file to extract information
        const content = await readFileAsync(configPath, 'utf-8');
        
        // Extract domains from server_name
        const serverNameMatch = content.match(/server_name\s+([^;]+);/);
        const domains = serverNameMatch 
          ? serverNameMatch[1].trim().split(/\s+/).filter(d => d && d !== '_')
          : [];
        
        // Check if SSL is enabled
        const hasSSL = content.includes('listen 443 ssl') || content.includes('ssl_certificate');
        
        // Extract upstream port
        const proxyPassMatch = content.match(/proxy_pass\s+http:\/\/[^:]+:(\d+)/);
        const port = proxyPassMatch ? parseInt(proxyPassMatch[1]) : null;
        
        sites.push({
          name: file,
          configPath: configPath,
          enabled: enabledSites.has(file),
          domain: domains[0] || file, // Use first domain or filename as fallback
          ssl: hasSSL,
          domains: domains.length > 0 ? domains : [],
          port: port || undefined,
          status: enabledSites.has(file) ? 'active' : 'disabled',
          lastModified: stats.mtime.toISOString(),
          size: stats.size.toString()
        } as any);
      }
    }
    
    // Get nginx status
    let isRunning = false;
    try {
      const { stdout: statusOutput } = await execAsync('systemctl is-active nginx', { encoding: 'utf-8' });
      isRunning = statusOutput.trim() === 'active';
    } catch (error) {
      // Service not running
      isRunning = false;
    }
    
    // Get nginx version
    let version = 'unknown';
    try {
      const { stderr: versionOutput } = await execAsync('nginx -v 2>&1', { encoding: 'utf-8' });
      version = versionOutput.replace('nginx version: ', '').replace('nginx/', '').trim();
    } catch (error) {
      console.error('Error getting nginx version:', error);
    }
    
    // Test nginx configuration
    let configTest = { valid: false, message: 'Not tested' };
    try {
      const { stderr: testOutput } = await execAsync('sudo nginx -t 2>&1', { encoding: 'utf-8' });
      configTest = {
        valid: testOutput.includes('syntax is ok') && testOutput.includes('test is successful'),
        message: testOutput || 'Configuration test completed'
      };
    } catch (error: any) {
      configTest = {
        valid: false,
        message: error.stderr || error.message || 'Configuration test failed'
      };
    }
    
    return NextResponse.json({
      success: true,
      sites,
      status: {
        isRunning,
        version,
        configTest,
        totalSites: sites.length,
        enabledSites: sites.filter(s => s.enabled).length
      }
    });
  } catch (error: any) {
    console.error('Error fetching nginx configs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch nginx configurations',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/nginx
 * Create or update nginx configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain, port, ssl, content } = body;
    
    if (!name || !domain) {
      return NextResponse.json({
        success: false,
        error: 'Name and domain are required'
      }, { status: 400 });
    }
    
    const configPath = `/etc/nginx/sites-available/${name}`;
    
    // Generate nginx config if content not provided
    let configContent = content;
    if (!configContent) {
      configContent = generateNginxConfig(domain, port || 3000, ssl);
    }
    
    // Write config file
    await writeFileAsync(configPath, configContent, 'utf-8');
    
    // Test nginx configuration
    try {
      await execAsync('nginx -t');
    } catch (error: any) {
      // Rollback if config is invalid
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      return NextResponse.json({
        success: false,
        error: 'Invalid nginx configuration',
        message: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Nginx configuration created successfully',
      configPath
    });
  } catch (error: any) {
    console.error('Error creating nginx config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create nginx configuration',
      message: error.message
    }, { status: 500 });
  }
}

function generateNginxConfig(domain: string, port: number, ssl: boolean): string {
  const wwwDomain = domain.startsWith('www.') ? domain : `www.${domain}`;
  const baseDomain = domain.startsWith('www.') ? domain.substring(4) : domain;
  
  let config = `# Auto-generated nginx configuration for ${domain}
# Generated at ${new Date().toISOString()}

server {
    listen 80;
    listen [::]:80;
    server_name ${baseDomain} ${wwwDomain};
    
    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    client_max_body_size 100M;
}`;
  
  return config;
}