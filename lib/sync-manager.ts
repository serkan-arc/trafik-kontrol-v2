/**
 * Sync Manager - Master Synchronization System
 * 
 * Handles synchronization between 3 systems:
 * 1. PM2 Processes
 * 2. Nginx Configurations  
 * 3. Database Records
 * 
 * Cross-references all 3 sources to detect inconsistencies
 */

import { db } from './db';
import { PM2Manager } from './pm2-manager';
import { SSLManager } from './ssl-manager';
import { execSync } from 'child_process';
import * as fs from 'fs';

export interface SyncSource {
  name: string;
  domain?: string;
  port?: number;
  status: string;
  source: 'pm2' | 'nginx' | 'database';
  details?: any;
}

export interface SyncReport {
  timestamp: string;
  sources: {
    pm2: SyncSource[];
    nginx: SyncSource[];
    database: SyncSource[];
  };
  crossReference: {
    allSynced: SyncSource[]; // Sites present in all 3 sources
    partialSync: SyncSource[]; // Sites in 2 sources
    orphans: {
      pm2Only: SyncSource[]; // PM2 process but no Nginx/DB
      nginxOnly: SyncSource[]; // Nginx config but no PM2/DB
      databaseOnly: SyncSource[]; // DB record but no PM2/Nginx
    };
  };
  issues: string[];
  recommendations: string[];
}

export class SyncManager {
  /**
   * Collect all PM2 processes
   */
  static async collectPM2Sources(): Promise<SyncSource[]> {
    const sources: SyncSource[] = [];
    
    try {
      const processes = await PM2Manager.listProcesses();
      
      for (const proc of processes) {
        // Skip system processes
        if (proc.name === 'filebrowser' || proc.name === 'traffic-control') {
          continue;
        }

        // Try to extract port from environment
        const procEnv = (proc as any).env;
        const port = procEnv?.PORT || procEnv?.port || null;

        sources.push({
          name: proc.name,
          port: port ? parseInt(port) : undefined,
          status: proc.status,
          source: 'pm2',
          details: {
            pm_id: proc.pm_id,
            pid: (proc as any).pid,
            memory: proc.memory,
            cpu: proc.cpu,
            uptime: proc.uptime,
            restarts: proc.restarts
          }
        });
      }
    } catch (error: any) {
      console.error('Error collecting PM2 sources:', error);
    }

    return sources;
  }

  /**
   * Collect all Nginx configurations
   */
  static async collectNginxSources(): Promise<SyncSource[]> {
    const sources: SyncSource[] = [];
    
    try {
      const nginxEnabledPath = '/etc/nginx/sites-enabled';
      
      if (!fs.existsSync(nginxEnabledPath)) {
        console.warn('Nginx sites-enabled directory not found');
        return sources;
      }

      const files = fs.readdirSync(nginxEnabledPath);
      
      for (const file of files) {
        // Skip system configs
        if (file === 'default' || file === 'dtektracking.com') continue;

        const configPath = `${nginxEnabledPath}/${file}`;
        
        // Read config file to extract details
        let domain = file;
        let port: number | undefined;
        let status = 'active';

        try {
          const configContent = fs.readFileSync(configPath, 'utf-8');
          
          // Extract server_name
          const serverNameMatch = configContent.match(/server_name\s+([^;]+);/);
          if (serverNameMatch) {
            domain = serverNameMatch[1].trim();
          }

          // Detect site type: static or dynamic
          const hasProxyPass = configContent.includes('proxy_pass');
          const hasRoot = configContent.match(/root\s+([^;]+);/);
          const isStatic = !hasProxyPass && hasRoot;

          // Extract proxy_pass port (only for dynamic sites)
          const proxyPassMatch = configContent.match(/proxy_pass\s+http:\/\/[^:]+:(\d+)/);
          if (proxyPassMatch) {
            port = parseInt(proxyPassMatch[1]);
          }

          // Check if SSL is enabled
          const hasSSL = configContent.includes('ssl_certificate');
          
          sources.push({
            name: file,
            domain,
            port,
            status: hasSSL ? 'ssl-enabled' : 'active',
            source: 'nginx',
            details: {
              configPath,
              hasSSL,
              isStatic,  // NEW: Static site flag
              siteType: isStatic ? 'static' : 'dynamic',  // NEW: Site type
              rootPath: hasRoot ? hasRoot[1].trim() : undefined,  // NEW: Root path for static sites
              rawContent: configContent.substring(0, 200) // First 200 chars for reference
            }
          });
        } catch (error: any) {
          console.error(`Error reading Nginx config ${file}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error('Error collecting Nginx sources:', error);
    }

    return sources;
  }

  /**
   * Collect all Database records
   */
  static async collectDatabaseSources(): Promise<SyncSource[]> {
    const sources: SyncSource[] = [];
    
    try {
      const result = await db.query(
        `SELECT id, name, domain, clean_port, status, ssl_enabled, site_type, pm2_name
         FROM deployed_sites 
         WHERE status != 'deleted'
         ORDER BY created_at DESC`
      );

      for (const site of result.rows) {
        sources.push({
          name: site.name,
          domain: site.domain,
          port: site.clean_port,
          status: site.status,
          source: 'database',
          details: {
            id: site.id,
            ssl_enabled: site.ssl_enabled,
            site_type: site.site_type,
            pm2_name: site.pm2_name
          }
        });
      }
    } catch (error: any) {
      console.error('Error collecting Database sources:', error);
    }

    return sources;
  }

  /**
   * Cross-reference all sources and generate sync report
   */
  static async generateSyncReport(): Promise<SyncReport> {
    console.log('🔄 Generating comprehensive sync report...');

    // Collect from all 3 sources
    const pm2Sources = await this.collectPM2Sources();
    const nginxSources = await this.collectNginxSources();
    const dbSources = await this.collectDatabaseSources();

    console.log(`📊 Collected: ${pm2Sources.length} PM2, ${nginxSources.length} Nginx, ${dbSources.length} DB`);

    // Cross-reference logic
    const allSynced: SyncSource[] = [];
    const partialSync: SyncSource[] = [];
    const pm2Only: SyncSource[] = [];
    const nginxOnly: SyncSource[] = [];
    const databaseOnly: SyncSource[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Helper: Check if two sources match
    const sourcesMatch = (s1: SyncSource, s2: SyncSource): boolean => {
      // Match by name (case-insensitive)
      if (s1.name.toLowerCase() === s2.name.toLowerCase()) return true;
      
      // Match by domain
      if (s1.domain && s2.domain && s1.domain === s2.domain) return true;
      
      // Match by port
      if (s1.port && s2.port && s1.port === s2.port) return true;
      
      // Partial name match (e.g., "my-site" matches "my-site-main")
      const name1 = s1.name.toLowerCase().split('-')[0];
      const name2 = s2.name.toLowerCase().split('-')[0];
      if (name1 === name2 && name1.length > 3) return true;
      
      return false;
    };

    // Process each DB source (authoritative source)
    for (const dbSite of dbSources) {
      const matchingPM2 = pm2Sources.find(pm2 => sourcesMatch(dbSite, pm2));
      const matchingNginx = nginxSources.find(nginx => sourcesMatch(dbSite, nginx));

      if (matchingPM2 && matchingNginx) {
        // Perfect sync - present in all 3
        allSynced.push({
          ...dbSite,
          details: {
            ...dbSite.details,
            pm2: matchingPM2.details,
            nginx: matchingNginx.details
          }
        });
      } else if (matchingPM2 || matchingNginx) {
        // Partial sync - present in 2 sources
        partialSync.push(dbSite);
        
        if (!matchingPM2) {
          // Check if this is a static site (doesn't need PM2)
          const isStaticSite = matchingNginx?.details?.isStatic;
          if (!isStaticSite) {
            issues.push(`⚠️ ${dbSite.name}: No PM2 process found`);
            recommendations.push(`Start PM2 process for ${dbSite.name}`);
          } else {
            console.log(`✅ ${dbSite.name} is static site, PM2 not required`);
          }
        }
        if (!matchingNginx) {
          issues.push(`⚠️ ${dbSite.name}: No Nginx configuration found`);
          recommendations.push(`Create Nginx config for ${dbSite.domain || dbSite.name}`);
        }
      } else {
        // Only in database
        databaseOnly.push(dbSite);
        issues.push(`❌ ${dbSite.name}: Only exists in database (no PM2/Nginx)`);
        recommendations.push(`Either deploy ${dbSite.name} or remove from database`);
      }
    }

    // Find PM2-only orphans (not in DB)
    for (const pm2Site of pm2Sources) {
      const inDB = dbSources.find(db => sourcesMatch(pm2Site, db));
      if (!inDB) {
        pm2Only.push(pm2Site);
        issues.push(`🔴 ${pm2Site.name}: PM2 process exists but no database record`);
        recommendations.push(`Add ${pm2Site.name} to database or stop PM2 process`);
      }
    }

    // Find Nginx-only orphans (not in DB)
    for (const nginxSite of nginxSources) {
      // Skip static sites - they don't need PM2 or database records
      if (nginxSite.details?.isStatic) {
        console.log(`✅ ${nginxSite.name} is static site, skipping PM2/DB validation`);
        continue;
      }
      
      const inDB = dbSources.find(db => sourcesMatch(nginxSite, db));
      if (!inDB) {
        nginxOnly.push(nginxSite);
        issues.push(`🟡 ${nginxSite.name}: Nginx config exists but no database record`);
        recommendations.push(`Add ${nginxSite.domain} to database or remove Nginx config`);
      }
    }

    const report: SyncReport = {
      timestamp: new Date().toISOString(),
      sources: {
        pm2: pm2Sources,
        nginx: nginxSources,
        database: dbSources
      },
      crossReference: {
        allSynced,
        partialSync,
        orphans: {
          pm2Only,
          nginxOnly,
          databaseOnly
        }
      },
      issues,
      recommendations
    };

    console.log(`✅ Sync report generated:`);
    console.log(`   - All synced: ${allSynced.length}`);
    console.log(`   - Partial sync: ${partialSync.length}`);
    console.log(`   - Orphans: PM2=${pm2Only.length}, Nginx=${nginxOnly.length}, DB=${databaseOnly.length}`);
    console.log(`   - Issues: ${issues.length}`);

    return report;
  }

  /**
   * Auto-fix sync issues (with confirmation)
   */
  static async autoFixIssues(report: SyncReport, options: {
    removeOrphanPM2?: boolean;
    removeOrphanNginx?: boolean;
    updateDatabaseStatus?: boolean;
  }): Promise<{ fixed: string[]; errors: string[] }> {
    const fixed: string[] = [];
    const errors: string[] = [];

    // Fix orphan PM2 processes
    if (options.removeOrphanPM2) {
      for (const orphan of report.crossReference.orphans.pm2Only) {
        try {
          await PM2Manager.delete(orphan.name);
          fixed.push(`Removed orphan PM2 process: ${orphan.name}`);
        } catch (error: any) {
          errors.push(`Failed to remove PM2 ${orphan.name}: ${error.message}`);
        }
      }
    }

    // Fix orphan Nginx configs
    if (options.removeOrphanNginx) {
      for (const orphan of report.crossReference.orphans.nginxOnly) {
        try {
          const configPath = orphan.details?.configPath;
          if (configPath && fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
            fixed.push(`Removed orphan Nginx config: ${orphan.name}`);
          }
        } catch (error: any) {
          errors.push(`Failed to remove Nginx ${orphan.name}: ${error.message}`);
        }
      }
    }

    // Update database statuses
    if (options.updateDatabaseStatus) {
      for (const partial of report.crossReference.partialSync) {
        try {
          const hasPM2 = report.sources.pm2.some(pm2 => pm2.name === partial.name);
          const newStatus = hasPM2 ? 'active' : 'stopped';
          
          await db.query(
            'UPDATE deployed_sites SET status = $1, updated_at = NOW() WHERE name = $2',
            [newStatus, partial.name]
          );
          fixed.push(`Updated ${partial.name} status to ${newStatus}`);
        } catch (error: any) {
          errors.push(`Failed to update DB for ${partial.name}: ${error.message}`);
        }
      }
    }

    return { fixed, errors };
  }
}
