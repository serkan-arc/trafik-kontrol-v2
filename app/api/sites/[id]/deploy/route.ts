// Station 2: Site Deployment API
// Handle full deployment workflow: PM2 + NGINX + SSL

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PM2Manager } from '@/lib/pm2-manager';
import { NginxGenerator } from '@/lib/nginx-generator';
import { SSLManager } from '@/lib/ssl-manager';
import { analyzeProject, buildProjectIfNeeded, generatePM2Command, isPortAvailable } from '@/lib/deployment-helpers';
import { injectTrackingIntoDirectory } from '@/lib/html-injector';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/sites/[id]/deploy
 * Deploy site with PM2 processes, NGINX config, and optional SSL
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    // Parse request body safely (may be empty)
    let body: any = {};
    try {
      const text = await request.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Body is empty or invalid, use defaults
    }
    
    const { requestSSL = false, sslEmail } = body;

    // Get site information
    const siteResult = await db.query(
      'SELECT * FROM deployed_sites WHERE id = $1',
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
    const deploymentLog: string[] = [];
    let pm2Processes: Record<string, number> = {};

    // Update status to deploying
    await db.query(
      'UPDATE deployed_sites SET status = $1 WHERE id = $2',
      ['deploying', id]
    );

    try {
      // Step 0: Analyze project configuration
      deploymentLog.push('Analyzing project configuration...');
      const projectConfig = await analyzeProject(site.file_path);
      
      deploymentLog.push(`Project type: ${projectConfig.isNextJs ? 'Next.js' : 'Unknown'}`);
      if (projectConfig.isNextJs) {
        deploymentLog.push(`Export mode: ${projectConfig.isStaticExport ? 'Static Export' : 'Server Mode'}`);
        deploymentLog.push(`Build status: ${projectConfig.hasBuild ? 'Built' : 'Not built'}`);
        
        if (projectConfig.needsBuild) {
          deploymentLog.push('Building project...');
          const buildResult = await buildProjectIfNeeded(site.file_path, projectConfig);
          if (!buildResult.success) {
            throw new Error(buildResult.message);
          }
          deploymentLog.push('✓ Build completed');
        }
      }

      // Step 0.5: Inject tracking script into HTML files (for static sites)
      if (site.site_type === 'static' || projectConfig.isStaticExport) {
        deploymentLog.push('Injecting tracking scripts into HTML files...');
        try {
          const injectionResult = await injectTrackingIntoDirectory(
            site.file_path,
            id,
            'http://207.180.204.60:3500'
          );
          deploymentLog.push(`✓ Tracking injected: ${injectionResult.success} files processed`);
        } catch (error: any) {
          deploymentLog.push(`⚠️ Tracking injection warning: ${error.message}`);
        }
      }

      // Step 0.6: Fix file permissions for static sites (Nginx needs to read them)
      if (site.site_type === 'static' || projectConfig.isStaticExport) {
        deploymentLog.push('Fixing file permissions for Nginx access...');
        try {
          // Set directory permissions to 755 (drwxr-xr-x)
          await execAsync(`chmod -R 755 "${site.file_path}"`);
          // Set file permissions to 644 (-rw-r--r--)
          await execAsync(`find "${site.file_path}" -type f -exec chmod 644 {} \\;`);
          deploymentLog.push('✓ File permissions fixed (755 for dirs, 644 for files)');
        } catch (error: any) {
          deploymentLog.push(`⚠️ Permission fix warning: ${error.message}`);
        }
      }

      // Step 1: Start PM2 processes
      deploymentLog.push('Starting PM2 process...');

      if (site.clean_port) {
        // Check if port is available
        const portAvailable = await isPortAvailable(site.clean_port);
        if (!portAvailable) {
          throw new Error(`Port ${site.clean_port} is already in use`);
        }

        // Open firewall port
        deploymentLog.push(`Opening firewall port ${site.clean_port}...`);
        try {
          await execAsync(`sudo ufw allow ${site.clean_port}/tcp`);
          deploymentLog.push(`✓ Firewall port ${site.clean_port} opened`);
        } catch (error: any) {
          deploymentLog.push(`Warning: Could not open firewall port: ${error.message}`);
        }

        // Generate process name
        const processName = site.name.replace(/\s+/g, '-').toLowerCase();
        
        // Generate PM2 command based on project type
        let pm2Command: string;
        if (site.site_type === 'static') {
          // Static HTML sites use npx serve
          pm2Command = `cd "${site.file_path}" && pm2 start "npx" --name "${processName}" -- serve@latest . -l ${site.clean_port}`;
        } else if (projectConfig.isStaticExport) {
          // Next.js static export uses npx serve on 'out' directory
          pm2Command = `cd "${site.file_path}" && pm2 start "npx" --name "${processName}" -- serve@latest out -l ${site.clean_port}`;
        } else {
          // Next.js server mode
          pm2Command = `cd "${site.file_path}" && PORT=${site.clean_port} pm2 start "npm" --name "${processName}" -- start`;
        }

        deploymentLog.push(`Executing: ${pm2Command}`);
        
        try {
          const { stdout, stderr } = await execAsync(pm2Command);
          deploymentLog.push('✓ PM2 process started');
          
          // Get PM2 ID from process list
          const { stdout: listOutput } = await execAsync(`pm2 jlist`);
          const processes = JSON.parse(listOutput);
          const process = processes.find((p: any) => p.name === processName);
          
          if (process) {
            const pm2Id = process.pm_id;
            deploymentLog.push(`Process ID: ${pm2Id}`);
            
            // Save PM2 info to database
            await db.query(
              'UPDATE deployed_sites SET pm2_name = $1, pm2_id = $2 WHERE id = $3',
              [processName, pm2Id, id]
            );
            
            pm2Processes[processName] = pm2Id;
          }
        } catch (error: any) {
          throw new Error(`PM2 start failed: ${error.message}`);
        }
      }

      // Step 2: Generate and deploy NGINX configuration (only if domain is provided)
      if (site.domain && site.domain.trim()) {
        deploymentLog.push('Generating NGINX configuration...');

        const nginxConfig = await NginxGenerator.generateConfig({
          domain: site.domain,
          siteName: site.name,
          siteType: site.site_type,
          cleanPort: site.clean_port,
          grayPort: site.gray_port,
          aggrPort: site.aggr_port,
          mobileCleanPort: site.mobile_clean_port,
          mobileGrayPort: site.mobile_gray_port,
          mobileAggrPort: site.mobile_aggr_port,
          sslEnabled: false, // Will be updated after SSL setup
          filePath: site.file_path
        });

        const configPath = await NginxGenerator.writeConfig(site.domain, nginxConfig);
        deploymentLog.push(`NGINX config written to: ${configPath}`);

        // Test NGINX config
        const testResult = await NginxGenerator.testConfig();
        if (!testResult.success) {
          throw new Error(`NGINX config test failed: ${testResult.output}`);
        }
        deploymentLog.push('NGINX configuration test passed');

        // Enable site
        await NginxGenerator.enableSite(site.domain);
        deploymentLog.push('Site enabled in NGINX');

        // Reload NGINX
        const reloadResult = await NginxGenerator.reloadNginx();
        if (!reloadResult.success) {
          throw new Error(`NGINX reload failed: ${reloadResult.output}`);
        }
        deploymentLog.push('NGINX reloaded successfully');

        // Save NGINX config path
        await db.query(
          'UPDATE deployed_sites SET nginx_config_path = $1 WHERE id = $2',
          [configPath, id]
        );
        
        // Insert nginx_configs record
        await db.query(
          `INSERT INTO nginx_configs (site_id, config_path, config_content, is_active, tested)
           VALUES ($1, $2, $3, true, true)`,
          [id, configPath, nginxConfig]
        );
      } else {
        deploymentLog.push('⚠️ No domain provided, skipping NGINX configuration');
        deploymentLog.push(`💡 Site will be accessible at: http://SERVER_IP:${site.clean_port}`);
      }

      // Step 3: Request SSL certificate if requested
      if (requestSSL) {
        deploymentLog.push('Requesting SSL certificate...');

        if (!sslEmail) {
          deploymentLog.push('Warning: SSL email not provided, skipping SSL setup');
        } else {
          const sslResult = await SSLManager.requestCertificate(
            site.domain,
            sslEmail,
            site.site_type === 'static' ? site.file_path : undefined
          );

          if (sslResult.success && sslResult.certificate) {
            deploymentLog.push('SSL certificate obtained successfully');

            // Update site with SSL information
            await db.query(
              `UPDATE deployed_sites 
               SET ssl_enabled = true, ssl_expires_at = $1 
               WHERE id = $2`,
              [sslResult.certificate.expiresAt, id]
            );

            // Insert ssl_certificates record
            await db.query(
              `INSERT INTO ssl_certificates 
               (site_id, domain, cert_path, key_path, fullchain_path, status, issued_at, expires_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                id,
                site.domain,
                sslResult.certificate.certPath,
                sslResult.certificate.keyPath,
                sslResult.certificate.fullchainPath,
                'active',
                sslResult.certificate.issuedAt,
                sslResult.certificate.expiresAt
              ]
            );

            // Regenerate NGINX config with SSL
            const sslNginxConfig = await NginxGenerator.generateConfig({
              domain: site.domain,
              siteName: site.name,
              siteType: site.site_type,
              cleanPort: site.clean_port,
              grayPort: site.gray_port,
              aggrPort: site.aggr_port,
              mobileCleanPort: site.mobile_clean_port,
              mobileGrayPort: site.mobile_gray_port,
              mobileAggrPort: site.mobile_aggr_port,
              sslEnabled: true,
              sslCertPath: sslResult.certificate.fullchainPath,
              sslKeyPath: sslResult.certificate.keyPath,
              filePath: site.file_path
            });

            await NginxGenerator.writeConfig(site.domain, sslNginxConfig);
            await NginxGenerator.reloadNginx();
            deploymentLog.push('NGINX updated with SSL configuration');
          } else {
            deploymentLog.push(`SSL certificate request failed: ${sslResult.message}`);
          }
        }
      }

      // Update site status to active
      await db.query(
        'UPDATE deployed_sites SET status = $1 WHERE id = $2',
        ['active', id]
      );

      deploymentLog.push('Deployment completed successfully!');

      return NextResponse.json({
        success: true,
        message: 'Site deployed successfully',
        deploymentLog,
        pm2Processes
      });

    } catch (error: any) {
      // Deployment failed, update status to error
      await db.query(
        'UPDATE deployed_sites SET status = $1 WHERE id = $2',
        ['error', id]
      );

      deploymentLog.push(`ERROR: ${error.message}`);

      return NextResponse.json(
        {
          success: false,
          error: 'Deployment failed',
          message: error.message,
          deploymentLog
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error deploying site:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deploy site',
        message: error.message
      },
      { status: 500 }
    );
  }
}
