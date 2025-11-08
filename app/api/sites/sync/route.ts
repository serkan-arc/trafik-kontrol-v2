// Site Sync API - Syncs database with actual PM2 processes and SSL certificates
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PM2Manager } from '@/lib/pm2-manager';
import { SSLManager } from '@/lib/ssl-manager';
import { execSync } from 'child_process';

/**
 * GET /api/sites/sync
 * Sync database with actual PM2 processes and SSL certificates
 */
export async function GET(request: NextRequest) {
  const report = {
    pm2: {
      found: 0,
      synced: 0,
      removed: 0,
      errors: [] as string[]
    },
    nginx: {
      found: 0,
      synced: 0,
      missing: 0,
      errors: [] as string[]
    },
    ssl: {
      found: 0,
      synced: 0,
      removed: 0,
      errors: [] as string[]
    },
    database: {
      cleaned: 0,
      updated: 0,
      errors: [] as string[]
    }
  };

  try {
    console.log('🔄 Starting site sync...');

    // Step 1: Get all sites from database
    const dbSites = await db.query('SELECT * FROM deployed_sites WHERE status != $1', ['deleted']);
    console.log(`📦 Found ${dbSites.rows.length} sites in database`);

    // Step 2: Get all PM2 processes
    const pm2Processes = await PM2Manager.listProcesses();
    console.log(`🔧 Found ${pm2Processes.length} PM2 processes`);
    report.pm2.found = pm2Processes.length;

    // Step 3: Get all Nginx configurations
    const fs = require('fs');
    const nginxConfigs: string[] = [];
    try {
      const nginxEnabledPath = '/etc/nginx/sites-enabled';
      if (fs.existsSync(nginxEnabledPath)) {
        const files = fs.readdirSync(nginxEnabledPath);
        nginxConfigs.push(...files.filter((f: string) => f !== 'default'));
      }
      console.log(`📋 Found ${nginxConfigs.length} Nginx configurations`);
      report.nginx.found = nginxConfigs.length;
    } catch (error: any) {
      console.error('Error reading Nginx configs:', error);
      report.nginx.errors.push(`Failed to read Nginx configs: ${error.message}`);
    }

    // Step 4: Get all SSL certificates from certbot
    const sslCertificates = await SSLManager.listCertificates();
    console.log(`🔒 Found ${sslCertificates.length} SSL certificates`);
    report.ssl.found = sslCertificates.length;

    // Step 5: Process each database site
    for (const site of dbSites.rows) {
      try {
        // Check Nginx configuration
        if (site.domain) {
          const nginxConfigExists = nginxConfigs.includes(site.domain) || 
                                   nginxConfigs.includes(`${site.domain.split('.')[0]}-main`);
          
          if (!nginxConfigExists) {
            console.log(`⚠️ Missing Nginx config for ${site.domain}`);
            report.nginx.missing++;
            report.nginx.errors.push(`Missing Nginx config: ${site.domain}`);
          } else {
            report.nginx.synced++;
          }
        }

        // Check PM2 status
        let pm2Found = false;
        let pm2Status = 'stopped';
        
        // Look for PM2 processes matching this site
        const siteNameLower = site.name.toLowerCase();
        const domainPart = site.domain ? site.domain.split('.')[0].toLowerCase() : '';
        
        for (const process of pm2Processes) {
          const processName = process.name.toLowerCase();
          
          // Multiple matching strategies
          if (
            processName === siteNameLower ||
            processName === `${siteNameLower}-main` ||
            processName === `${siteNameLower}-clean` ||
            processName.includes(domainPart) ||
            (site.pm2_name && processName === site.pm2_name.toLowerCase())
          ) {
            pm2Found = true;
            pm2Status = process.status === 'online' ? 'active' : 'error';
            
            // Store PM2 process info in database
            await db.query(
              `UPDATE deployed_sites 
               SET pm2_processes = $1, status = $2, updated_at = NOW()
               WHERE id = $3`,
              [
                JSON.stringify([{
                  name: process.name,
                  pm_id: process.pm_id,
                  status: process.status,
                  memory: process.memory,
                  cpu: process.cpu
                }]),
                pm2Status,
                site.id
              ]
            );
            report.pm2.synced++;
            break;
          }
        }

        if (!pm2Found && site.status === 'active') {
          // Site marked as active but no PM2 process found
          await db.query(
            `UPDATE deployed_sites 
             SET status = 'stopped', pm2_processes = '[]', updated_at = NOW()
             WHERE id = $1`,
            [site.id]
          );
          report.database.updated++;
        }

        // Check SSL status if domain exists
        if (site.domain) {
          const sslCert = sslCertificates.find(cert => 
            cert.domain === site.domain || 
            cert.domain.includes(site.domain)
          );

          if (sslCert) {
            // Update SSL info in database
            const existingSSL = await db.query(
              'SELECT id FROM ssl_certificates WHERE domain = $1',
              [site.domain]
            );

            if (existingSSL.rows.length === 0) {
              // Insert new SSL record
              await db.query(
                `INSERT INTO ssl_certificates 
                 (site_id, domain, cert_path, key_path, fullchain_path, status, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  site.id,
                  site.domain,
                  sslCert.certPath,
                  sslCert.keyPath,
                  sslCert.fullchainPath,
                  sslCert.status,
                  sslCert.expiresAt
                ]
              );
              report.ssl.synced++;
            } else {
              // Update existing SSL record
              await db.query(
                `UPDATE ssl_certificates 
                 SET cert_path = $1, key_path = $2, fullchain_path = $3, 
                     status = $4, expires_at = $5, updated_at = NOW()
                 WHERE domain = $6`,
                [
                  sslCert.certPath,
                  sslCert.keyPath,
                  sslCert.fullchainPath,
                  sslCert.status,
                  sslCert.expiresAt,
                  site.domain
                ]
              );
              report.ssl.synced++;
            }

            // Update site SSL status
            await db.query(
              `UPDATE deployed_sites 
               SET ssl_enabled = true, updated_at = NOW()
               WHERE id = $1`,
              [site.id]
            );
          } else if (site.ssl_enabled) {
            // Site marked as SSL enabled but no certificate found
            await db.query(
              `UPDATE deployed_sites 
               SET ssl_enabled = false, updated_at = NOW()
               WHERE id = $1`,
              [site.id]
            );
            
            // Remove orphaned SSL records
            await db.query(
              'DELETE FROM ssl_certificates WHERE site_id = $1',
              [site.id]
            );
            report.ssl.removed++;
          }
        }
      } catch (error: any) {
        console.error(`Error processing site ${site.name}:`, error);
        report.database.errors.push(`${site.name}: ${error.message}`);
      }
    }

    // Step 5: Find orphaned PM2 processes (not in database)
    const dbSiteNames = dbSites.rows.map(s => s.name.toLowerCase());
    const dbDomains = dbSites.rows.filter(s => s.domain).map(s => s.domain.split('.')[0].toLowerCase());
    
    for (const process of pm2Processes) {
      const processName = process.name.toLowerCase();
      
      // Skip system processes
      if (
        processName === 'traffic-control' || 
        processName === 'filebrowser' ||
        processName.includes('garantor')
      ) {
        continue;
      }

      // Check if this process belongs to any site in database
      let belongsToSite = false;
      for (const siteName of dbSiteNames) {
        if (processName.includes(siteName)) {
          belongsToSite = true;
          break;
        }
      }
      
      for (const domain of dbDomains) {
        if (processName.includes(domain)) {
          belongsToSite = true;
          break;
        }
      }

      if (!belongsToSite) {
        // Orphaned process - optionally remove it
        console.log(`⚠️ Found orphaned PM2 process: ${process.name}`);
        report.pm2.errors.push(`Orphaned process: ${process.name}`);
        
        // Optional: Delete orphaned process
        // await PM2Manager.delete(process.name);
        // report.pm2.removed++;
      }
    }

    // Step 6: Clean up orphaned SSL certificates
    const dbDomainsAll = dbSites.rows.filter(s => s.domain).map(s => s.domain);
    
    for (const cert of sslCertificates) {
      if (!dbDomainsAll.includes(cert.domain)) {
        console.log(`⚠️ Found orphaned SSL certificate: ${cert.domain}`);
        report.ssl.errors.push(`Orphaned certificate: ${cert.domain}`);
        
        // Remove from database
        await db.query('DELETE FROM ssl_certificates WHERE domain = $1', [cert.domain]);
        report.ssl.removed++;
      }
    }

    // Step 7: Final cleanup - remove deleted sites older than 30 days
    const cleanupResult = await db.query(
      `DELETE FROM deployed_sites 
       WHERE status = 'deleted' 
       AND updated_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    );
    report.database.cleaned = cleanupResult.rowCount || 0;

    console.log('✅ Sync completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Sites synchronized successfully',
      report,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        message: error.message,
        report
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sites/sync
 * Force sync with cleanup options
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      removeOrphans = false,
      cleanDeleted = true,
      autoFixSSL = false 
    } = body;

    const actions = [];

    // Remove orphaned PM2 processes
    if (removeOrphans) {
      const pm2Processes = await PM2Manager.listProcesses();
      const dbSites = await db.query('SELECT name, domain FROM deployed_sites WHERE status != $1', ['deleted']);
      
      const validNames = new Set(
        dbSites.rows.flatMap(s => [
          s.name.toLowerCase(),
          `${s.name.toLowerCase()}-main`,
          `${s.name.toLowerCase()}-clean`,
          `${s.name.toLowerCase()}-gray`,
          `${s.name.toLowerCase()}-aggressive`,
          s.domain ? s.domain.split('.')[0].toLowerCase() : null
        ]).filter(Boolean)
      );

      // Keep system processes
      validNames.add('traffic-control');
      validNames.add('filebrowser');

      for (const process of pm2Processes) {
        if (!validNames.has(process.name.toLowerCase())) {
          await PM2Manager.delete(process.name);
          actions.push(`Removed PM2 process: ${process.name}`);
        }
      }
    }

    // Clean deleted sites
    if (cleanDeleted) {
      const result = await db.query(
        `DELETE FROM deployed_sites 
         WHERE status = 'deleted'
         RETURNING name`
      );
      
      if (result.rowCount && result.rowCount > 0) {
        actions.push(`Removed ${result.rowCount} deleted sites from database`);
      }
    }

    // Auto-fix SSL certificates
    if (autoFixSSL) {
      const sslCerts = await SSLManager.listCertificates();
      
      for (const cert of sslCerts) {
        const expiry = await SSLManager.checkExpiry(cert.domain);
        
        if (expiry.needsRenewal) {
          const renewal = await SSLManager.renewCertificate(cert.domain);
          if (renewal.success) {
            actions.push(`Renewed SSL for ${cert.domain}`);
          }
        }
      }
    }

    // Now run regular sync
    const syncResponse = await GET(request);
    const syncData = await syncResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Force sync completed',
      actions,
      syncReport: syncData.report,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Force sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Force sync failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}