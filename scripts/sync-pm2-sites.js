#!/usr/bin/env node
/**
 * Sync PM2 Sites to Database
 * Populates sites table from existing Nginx configs
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres.dtekai.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dtektracking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Parse Nginx config
function parseNginxConfig(configPath) {
  try {
    if (!existsSync(configPath)) return null;

    const content = readFileSync(configPath, 'utf-8');
    
    // Extract domain
    const serverNameMatch = content.match(/server_name\s+([^;]+);/);
    const domains = serverNameMatch?.[1]?.trim().split(/\s+/) || [];
    const domain = domains[0];
    
    if (!domain) return null;

    // Extract port
    const proxyPassMatch = content.match(/proxy_pass\s+http:\/\/[^:]+:(\d+)/);
    const port = proxyPassMatch ? parseInt(proxyPassMatch[1]) : null;
    
    if (!port) return null;

    // Check SSL
    const sslCertMatch = content.match(/ssl_certificate\s+([^;]+);/);
    const ssl_enabled = !!sslCertMatch;
    const ssl_cert_path = sslCertMatch?.[1]?.trim();

    // Get SSL expiry
    let ssl_expires_at = null;
    if (ssl_cert_path && existsSync(ssl_cert_path)) {
      try {
        const output = execSync(`openssl x509 -enddate -noout -in "${ssl_cert_path}"`, { encoding: 'utf-8' });
        const dateMatch = output.match(/notAfter=(.+)/);
        if (dateMatch) {
          ssl_expires_at = new Date(dateMatch[1]);
        }
      } catch (e) {
        // Ignore SSL errors
      }
    }

    return {
      domain,
      port,
      ssl_enabled,
      ssl_cert_path,
      ssl_expires_at,
      nginx_config_path: configPath
    };
  } catch (error) {
    return null;
  }
}

// Detect site type
function detectSiteType(domain) {
  const lower = domain.toLowerCase();
  if (lower.includes('traffic') || lower.includes('garantor')) return 'nextjs';
  if (lower.includes('tracking') || lower.includes('manager')) return 'nextjs';
  if (lower.includes('ozphyzen')) return 'static';
  return 'static';
}

// Main function
async function syncSites() {
  console.log('🔄 Syncing PM2 sites to database...\n');
  
  try {
    // Get nginx config files
    const output = execSync('ls /etc/nginx/sites-available/', { encoding: 'utf-8' });
    const configFiles = output.split('\n')
      .filter(f => f && !f.includes('backup') && !f.includes('before-restore') && !f.includes('default'));
    
    console.log(`📦 Found ${configFiles.length} nginx configs\n`);
    
    const sites = [];
    
    for (const configFile of configFiles) {
      const configPath = `/etc/nginx/sites-available/${configFile}`;
      const siteInfo = parseNginxConfig(configPath);
      
      if (siteInfo && siteInfo.domain && siteInfo.port) {
        sites.push({
          name: siteInfo.domain.split('.')[0],
          domain: siteInfo.domain,
          port: siteInfo.port,
          ssl_enabled: siteInfo.ssl_enabled,
          ssl_expires_at: siteInfo.ssl_expires_at,
          nginx_config_path: siteInfo.nginx_config_path,
          site_type: detectSiteType(siteInfo.domain),
          status: 'active'
        });
        
        console.log(`✅ Parsed: ${siteInfo.domain} → port ${siteInfo.port} ${siteInfo.ssl_enabled ? '🔒' : ''}`);
      }
    }
    
    console.log(`\n💾 Inserting ${sites.length} sites into database...\n`);
    
    let inserted = 0;
    let updated = 0;
    
    for (const site of sites) {
      try {
        const result = await pool.query(
          `INSERT INTO deployed_sites (name, domain, file_path, clean_port, ssl_enabled, ssl_expires_at, nginx_config_path, site_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (domain) 
           DO UPDATE SET 
             clean_port = EXCLUDED.clean_port,
             status = EXCLUDED.status,
             ssl_enabled = EXCLUDED.ssl_enabled,
             ssl_expires_at = EXCLUDED.ssl_expires_at,
             nginx_config_path = EXCLUDED.nginx_config_path
           RETURNING id, (xmax = 0) AS inserted`,
          [
            site.name,
            site.domain,
            '/var/www/' + site.domain,
            site.port,
            site.ssl_enabled,
            site.ssl_expires_at,
            site.nginx_config_path,
            site.site_type,
            site.status
          ]
        );
        
        if (result.rows[0].inserted) {
          inserted++;
          console.log(`  ✅ Inserted: ${site.domain}`);
        } else {
          updated++;
          console.log(`  🔄 Updated: ${site.domain}`);
        }
      } catch (error) {
        console.error(`  ❌ Error: ${site.domain} - ${error.message}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Inserted: ${inserted} sites`);
    console.log(`   🔄 Updated: ${updated} sites`);
    console.log(`   📦 Total: ${inserted + updated} sites`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  console.log('\n✨ Sync complete!\n');
}

// Run
syncSites().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
