// Station 2: NGINX Configuration Generator
// Handles generation of NGINX configs for deployed sites

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface NginxConfig {
  domain: string;
  siteName: string;
  siteType: 'static' | 'nodejs' | 'nextjs' | 'react';
  cleanPort?: number;
  grayPort?: number;
  aggrPort?: number;
  mobileCleanPort?: number;
  mobileGrayPort?: number;
  mobileAggrPort?: number;
  sslEnabled: boolean;
  sslCertPath?: string;
  sslKeyPath?: string;
  filePath: string;
}

export class NginxGenerator {
  private static readonly NGINX_SITES_PATH = '/etc/nginx/sites-available';
  private static readonly NGINX_ENABLED_PATH = '/etc/nginx/sites-enabled';

  /**
   * Generate NGINX configuration for a deployed site
   */
  static async generateConfig(config: NginxConfig): Promise<string> {
    const { siteType, domain } = config;

    let nginxConfig = '';

    switch (siteType) {
      case 'static':
        nginxConfig = this.generateStaticSiteConfig(config);
        break;
      case 'nodejs':
      case 'nextjs':
      case 'react':
        nginxConfig = this.generateNodeAppConfig(config);
        break;
      default:
        throw new Error(`Unsupported site type: ${siteType}`);
    }

    return nginxConfig;
  }

  /**
   * Generate config for static HTML sites
   */
  private static generateStaticSiteConfig(config: NginxConfig): string {
    const { domain, filePath, sslEnabled, sslCertPath, sslKeyPath, cleanPort, grayPort, aggrPort } = config;

    let config_content = `# Static Site Configuration: ${domain}
# Generated: ${new Date().toISOString()}

`;

    // HTTP to HTTPS redirect (if SSL enabled)
    if (sslEnabled) {
      config_content += `server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

`;
    }

    // Main server block
    config_content += `server {
    ${sslEnabled ? `listen 443 ssl http2;
    listen [::]:443 ssl http2;` : `listen 80;
    listen [::]:80;`}
    
    server_name ${domain} www.${domain};
    
    ${sslEnabled && sslCertPath && sslKeyPath ? `# SSL Configuration
    ssl_certificate ${sslCertPath};
    ssl_certificate_key ${sslKeyPath};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    ` : ''}# Root directory
    root ${filePath};
    index index.html index.htm;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Access and error logs
    access_log /var/log/nginx/${domain}_access.log;
    error_log /var/log/nginx/${domain}_error.log;
}
`;

    return config_content;
  }

  /**
   * Generate config for Node.js/Next.js applications with Clean/Gray/Aggressive versions
   */
  private static generateNodeAppConfig(config: NginxConfig): string {
    const { 
      domain, 
      sslEnabled, 
      sslCertPath, 
      sslKeyPath, 
      cleanPort, 
      grayPort, 
      aggrPort,
      mobileCleanPort,
      mobileGrayPort,
      mobileAggrPort
    } = config;

    let config_content = `# Node.js App Configuration: ${domain}
# Generated: ${new Date().toISOString()}
# Supports Clean/Gray/Aggressive versions with mobile detection

`;

    // Upstream definitions for different versions
    if (cleanPort) {
      config_content += `upstream ${domain.replace(/\./g, '_')}_clean {
    server 127.0.0.1:${cleanPort};
    keepalive 64;
}

`;
    }

    if (grayPort) {
      config_content += `upstream ${domain.replace(/\./g, '_')}_gray {
    server 127.0.0.1:${grayPort};
    keepalive 64;
}

`;
    }

    if (aggrPort) {
      config_content += `upstream ${domain.replace(/\./g, '_')}_aggr {
    server 127.0.0.1:${aggrPort};
    keepalive 64;
}

`;
    }

    // Mobile upstreams
    if (mobileCleanPort) {
      config_content += `upstream ${domain.replace(/\./g, '_')}_mobile_clean {
    server 127.0.0.1:${mobileCleanPort};
    keepalive 64;
}

`;
    }

    if (mobileGrayPort) {
      config_content += `upstream ${domain.replace(/\./g, '_')}_mobile_gray {
    server 127.0.0.1:${mobileGrayPort};
    keepalive 64;
}

`;
    }

    if (mobileAggrPort) {
      config_content += `upstream ${domain.replace(/\./g, '_')}_mobile_aggr {
    server 127.0.0.1:${mobileAggrPort};
    keepalive 64;
}

`;
    }

    // HTTP to HTTPS redirect
    if (sslEnabled) {
      config_content += `server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};
    
    return 301 https://$server_name$request_uri;
}

`;
    }

    // Main server block with routing logic
    config_content += `server {
    ${sslEnabled ? `listen 443 ssl http2;
    listen [::]:443 ssl http2;` : `listen 80;
    listen [::]:80;`}
    
    server_name ${domain} www.${domain};
    
    ${sslEnabled && sslCertPath && sslKeyPath ? `# SSL Configuration
    ssl_certificate ${sslCertPath};
    ssl_certificate_key ${sslKeyPath};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    ` : ''}# Client settings
    client_max_body_size 50M;
    client_body_buffer_size 128k;
    
    # Timeouts
    proxy_connect_timeout 90;
    proxy_send_timeout 90;
    proxy_read_timeout 90;
    
    # Mobile detection
    set $is_mobile 0;
    if ($http_user_agent ~* "(android|iphone|ipad|mobile|webos)") {
        set $is_mobile 1;
    }
    
    # Version routing variable (default: clean)
    set $version "clean";
    
    # Check for version query parameter (?v=gray or ?v=aggressive)
    if ($arg_v = "gray") {
        set $version "gray";
    }
    if ($arg_v = "aggressive") {
        set $version "aggr";
    }
    
    # Check for version cookie
    if ($cookie_site_version = "gray") {
        set $version "gray";
    }
    if ($cookie_site_version = "aggressive") {
        set $version "aggr";
    }
    
    # Main location with version routing
    location / {
        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Route based on version and device type
        ${this.generateRoutingLogic(config)}
    }
    
    # API routes (always use clean version)
    location /api/ {
        proxy_pass http://${domain.replace(/\./g, '_')}_clean;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # Access and error logs
    access_log /var/log/nginx/${domain}_access.log;
    error_log /var/log/nginx/${domain}_error.log;
}
`;

    return config_content;
  }

  /**
   * Generate routing logic based on available ports
   */
  private static generateRoutingLogic(config: NginxConfig): string {
    const domain_underscore = config.domain.replace(/\./g, '_');
    const hasClean = !!config.cleanPort;
    const hasGray = !!config.grayPort;
    const hasAggr = !!config.aggrPort;
    const hasMobileClean = !!config.mobileCleanPort;
    const hasMobileGray = !!config.mobileGrayPort;
    const hasMobileAggr = !!config.mobileAggrPort;

    let routing = '';

    // If mobile versions exist, handle mobile routing
    if (hasMobileClean || hasMobileGray || hasMobileAggr) {
      routing += `# Mobile routing\n`;
      routing += `        if ($is_mobile = 1) {\n`;
      
      if (hasMobileAggr) {
        routing += `            if ($version = "aggr") {\n`;
        routing += `                proxy_pass http://${domain_underscore}_mobile_aggr;\n`;
        routing += `                break;\n`;
        routing += `            }\n`;
      }
      
      if (hasMobileGray) {
        routing += `            if ($version = "gray") {\n`;
        routing += `                proxy_pass http://${domain_underscore}_mobile_gray;\n`;
        routing += `                break;\n`;
        routing += `            }\n`;
      }
      
      if (hasMobileClean) {
        routing += `            proxy_pass http://${domain_underscore}_mobile_clean;\n`;
        routing += `            break;\n`;
      }
      
      routing += `        }\n\n`;
    }

    // Desktop routing
    routing += `        # Desktop routing\n`;
    
    if (hasAggr) {
      routing += `        if ($version = "aggr") {\n`;
      routing += `            proxy_pass http://${domain_underscore}_aggr;\n`;
      routing += `            break;\n`;
      routing += `        }\n`;
    }
    
    if (hasGray) {
      routing += `        if ($version = "gray") {\n`;
      routing += `            proxy_pass http://${domain_underscore}_gray;\n`;
      routing += `            break;\n`;
      routing += `        }\n`;
    }
    
    if (hasClean) {
      routing += `        proxy_pass http://${domain_underscore}_clean;\n`;
    }

    return routing;
  }

  /**
   * Write NGINX configuration to file
   */
  static async writeConfig(domain: string, config: string): Promise<string> {
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    const configPath = path.join(this.NGINX_SITES_PATH, sanitizedDomain);
    
    await fs.writeFile(configPath, config, 'utf8');
    
    return configPath;
  }

  /**
   * Test NGINX configuration
   */
  static async testConfig(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync('nginx -t 2>&1');
      const output = stdout + stderr;
      
      return {
        success: output.includes('syntax is ok') && output.includes('test is successful'),
        output
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.message || 'Configuration test failed'
      };
    }
  }

  /**
   * Enable site (create symlink)
   */
  static async enableSite(domain: string): Promise<void> {
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    const availablePath = path.join(this.NGINX_SITES_PATH, sanitizedDomain);
    const enabledPath = path.join(this.NGINX_ENABLED_PATH, sanitizedDomain);
    
    try {
      // Remove existing symlink if it exists
      await fs.unlink(enabledPath).catch(() => {});
      
      // Create new symlink
      await fs.symlink(availablePath, enabledPath);
    } catch (error: any) {
      throw new Error(`Failed to enable site: ${error.message}`);
    }
  }

  /**
   * Disable site (remove symlink)
   */
  static async disableSite(domain: string): Promise<void> {
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    const enabledPath = path.join(this.NGINX_ENABLED_PATH, sanitizedDomain);
    
    try {
      await fs.unlink(enabledPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to disable site: ${error.message}`);
      }
    }
  }

  /**
   * Reload NGINX
   */
  static async reloadNginx(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync('systemctl reload nginx 2>&1');
      return {
        success: true,
        output: stdout + stderr
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.message || 'Failed to reload NGINX'
      };
    }
  }

  /**
   * Full deployment workflow: generate -> write -> test -> enable -> reload
   */
  static async deployConfig(config: NginxConfig): Promise<{ success: boolean; message: string; configPath?: string }> {
    try {
      // Generate config
      const nginxConfig = await this.generateConfig(config);
      
      // Write config
      const configPath = await this.writeConfig(config.domain, nginxConfig);
      
      // Test config
      const testResult = await this.testConfig();
      if (!testResult.success) {
        return {
          success: false,
          message: `NGINX configuration test failed: ${testResult.output}`
        };
      }
      
      // Enable site
      await this.enableSite(config.domain);
      
      // Reload NGINX
      const reloadResult = await this.reloadNginx();
      if (!reloadResult.success) {
        return {
          success: false,
          message: `NGINX reload failed: ${reloadResult.output}`
        };
      }
      
      return {
        success: true,
        message: 'NGINX configuration deployed successfully',
        configPath
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Deployment failed: ${error.message}`
      };
    }
  }
}
