// Station 2: Site Management API - Individual Site Operations
// API endpoint for managing individual deployed sites

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sites/[id]
 * Get detailed information about a specific site
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const result = await db.query(
      `SELECT 
        ds.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', nc.id,
          'config_path', nc.config_path,
          'is_active', nc.is_active,
          'tested', nc.tested,
          'created_at', nc.created_at
        )) FILTER (WHERE nc.id IS NOT NULL) as nginx_configs,
        json_agg(DISTINCT jsonb_build_object(
          'id', sc.id,
          'domain', sc.domain,
          'status', sc.status,
          'issued_at', sc.issued_at,
          'expires_at', sc.expires_at,
          'auto_renew', sc.auto_renew
        )) FILTER (WHERE sc.id IS NOT NULL) as ssl_certificates
      FROM deployed_sites ds
      LEFT JOIN nginx_configs nc ON nc.site_id = ds.id
      LEFT JOIN ssl_certificates sc ON sc.site_id = ds.id
      WHERE ds.id = $1
      GROUP BY ds.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Site not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching site:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch site',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sites/[id]
 * Update site configuration
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Check if site exists
    const existingResult = await db.query(
      'SELECT * FROM deployed_sites WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Site not found'
        },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const allowedFields = [
      'name', 'domain', 'file_path', 'site_type',
      'clean_port', 'gray_port', 'aggr_port',
      'mobile_clean_port', 'mobile_gray_port', 'mobile_aggr_port',
      'ssl_enabled', 'status', 'nginx_config_path', 'pm2_processes'
    ];

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid fields to update'
        },
        { status: 400 }
      );
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);

    // Add id parameter
    params.push(id);

    const result = await db.query(
      `UPDATE deployed_sites 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    return NextResponse.json({
      success: true,
      message: 'Site updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating site:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update site',
        message: error.message
      },
      { status: 500 }
    );
  }
}



/**
 * DELETE /api/sites/[id]
 * Delete a deployed site and all its configurations
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const steps: string[] = [];
  
  try {
    const { id } = await context.params;
    
    // Parse request body safely (may be empty)
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Body is empty or invalid, use defaults
    }
    
    const options = body.options || {
      stopPM2: true,
      removeNginx: true,
      removeSSL: true,
      removeDB: true,
      removeFiles: false,
    };

    // Check if site exists
    const existingResult = await db.query(
      'SELECT * FROM deployed_sites WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Site not found'
        },
        { status: 404 }
      );
    }

    const site = existingResult.rows[0];
    steps.push(`🔍 Site bulundu: ${site.domain}`);

    // Step 1: Stop PM2 Process
    if (options.stopPM2) {
      try {
        const { execSync } = require('child_process');
        let processFound = false;
        
        // Safety check: Don't delete the panel itself!
        if (site.domain === 'garantor360.com' || site.name === 'traffic-control') {
          steps.push(`⚠️ Panel kendini silemez! PM2 korundu.`);
          processFound = true; // Skip PM2 deletion
        }
        
        if (!processFound) {
          try {
            // Get all PM2 processes
            const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
            const processes = JSON.parse(pm2List);
            
            steps.push(`🔍 ${processes.length} PM2 process kontrol ediliyor...`);
            
            const domainParts = site.domain.split('.')[0].toLowerCase();
            
            // Try multiple matching strategies
            for (const proc of processes) {
              const procName = proc.name?.toLowerCase() || '';
              const procPort = proc.pm2_env?.PORT || proc.pm2_env?.port;
              const procPid = proc.pid;
              
              let matched = false;
              let matchReason = '';
              
              // Strategy 1: Exact port match
              if (procPort && procPort == site.clean_port) {
                matched = true;
                matchReason = `port ${procPort}`;
              }
              
              // Strategy 2: Name contains domain part
              if (!matched && procName.includes(domainParts)) {
                matched = true;
                matchReason = `isim: ${proc.name}`;
              }
              
              // Strategy 3: DB stored PM2 name
              if (!matched && site.pm2_name && procName === site.pm2_name.toLowerCase()) {
                matched = true;
                matchReason = `DB PM2 ismi: ${site.pm2_name}`;
              }
              
              // Strategy 4: Check if PID is using the port
              if (!matched && procPid) {
                try {
                  const lsofOutput = execSync(`sudo lsof -i :${site.clean_port} -t`, { encoding: 'utf-8' }).trim();
                  if (lsofOutput.includes(String(procPid))) {
                    matched = true;
                    matchReason = `PID ${procPid} port ${site.clean_port} kullanıyor`;
                  }
                } catch (e) {
                  // Port not in use or lsof failed
                }
              }
              
              if (matched) {
                steps.push(`✅ Process bulundu: ${proc.name} (${matchReason})`);
                
                try {
                  execSync(`pm2 delete ${proc.pm_id}`, { encoding: 'utf-8' });
                  execSync('pm2 save --force', { encoding: 'utf-8' });
                  steps.push(`✅ PM2 process durduruldu: ${proc.name}`);
                  processFound = true;
                  break;
                } catch (deleteError: any) {
                  steps.push(`❌ PM2 silme hatası: ${deleteError.message}`);
                }
              }
            }
          } catch (e: any) {
            steps.push(`⚠️ PM2 liste alınamadı: ${e.message}`);
          }
        }
        
        if (!processFound) {
          steps.push(`⚠️ Port ${site.clean_port} için PM2 process bulunamadı (zaten durdurulmuş olabilir)`);
        }
      } catch (error) {
        steps.push(`❌ PM2 hatası: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Step 2: Remove Nginx Config
    if (options.removeNginx) {
      // Safety check: Don't touch panel's Nginx config!
      if (site.domain === 'garantor360.com' || site.name === 'traffic-control') {
        steps.push(`⚠️ Panel'in Nginx config'i korundu (güvenlik)`);
      } else {
        try {
          const { execSync } = require('child_process');
          const fs = require('fs');
          
          const enabledPath = `/etc/nginx/sites-enabled/${site.domain}`;
          const availablePath = `/etc/nginx/sites-available/${site.domain}`;
          
          // Remove symlink
          if (fs.existsSync(enabledPath)) {
            execSync(`sudo rm ${enabledPath}`);
            steps.push(`✅ Nginx symlink silindi`);
          }
          
          // Remove config file
          if (fs.existsSync(availablePath)) {
            execSync(`sudo rm ${availablePath}`);
            steps.push(`✅ Nginx config silindi`);
          }
          
          // Test and reload nginx synchronously but with proper error handling
          try {
            const testResult = execSync('sudo nginx -t 2>&1', { encoding: 'utf-8' });
            steps.push(`✅ Nginx config testi geçti`);
            
            // Reload nginx - use timeout to prevent hanging
            try {
              execSync('sudo timeout 5 systemctl reload nginx', { encoding: 'utf-8' });
              steps.push(`✅ Nginx başarıyla yeniden yüklendi`);
            } catch (reloadError) {
              // Reload might timeout but that's okay, nginx will still reload
              steps.push(`🔄 Nginx yeniden yükleniyor...`);
            }
          } catch (testError: any) {
            steps.push(`⚠️ Nginx config hatası tespit edildi`);
            steps.push(`⚠️ Hata: ${testError.message}`);
            steps.push(`⚠️ Nginx reload yapılmadı (güvenlik)`);
          }
        } catch (error) {
          steps.push(`❌ Nginx hatası: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    // Step 3: Remove SSL Certificate
    if (options.removeSSL && site.ssl_enabled) {
      try {
        const { execSync } = require('child_process');
        execSync(`sudo certbot delete --cert-name ${site.domain} --non-interactive`, { encoding: 'utf-8' });
        steps.push(`✅ SSL sertifikası kaldırıldı`);
      } catch (error) {
        steps.push(`⚠️  SSL sertifikası bulunamadı veya kaldırılamadı`);
      }
    }

    // Step 4: Remove from Database
    if (options.removeDB) {
      // Safety check: Don't delete panel from database!
      if (site.domain === 'garantor360.com' || site.name === 'traffic-control') {
        steps.push(`❌ Panel veritabanından silinemez! (güvenlik)`);
      } else {
        await db.query('DELETE FROM deployed_sites WHERE id = $1', [id]);
        steps.push(`✅ Veritabanı kaydı silindi`);
      }
    }

    // Step 5: Remove Files (optional and dangerous!)
    if (options.removeFiles) {
      try {
        const { execSync } = require('child_process');
        const fs = require('fs');
        
        if (site.file_path && fs.existsSync(site.file_path)) {
          // Create backup first
          const backupPath = `/root/backups/${site.domain}-${Date.now()}.tar.gz`;
          execSync(`sudo mkdir -p /root/backups`);
          execSync(`sudo tar -czf ${backupPath} ${site.file_path}`);
          steps.push(`📦 Yedek oluşturuldu: ${backupPath}`);
          
          // Remove files
          execSync(`sudo rm -rf ${site.file_path}`);
          steps.push(`✅ Site dosyaları silindi`);
        }
      } catch (error) {
        steps.push(`❌ Dosya silme hatası: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    steps.push(`🎉 Site başarıyla kaldırıldı!`);
    steps.push(`📅 Tamamlanma zamanı: ${new Date().toLocaleString('tr-TR')}`);

    // Log to console for debugging
    console.log(`✅ Site silindi: ${site.domain} (ID: ${id})`);
    console.log(`📝 Adımlar:`, steps);

    return NextResponse.json({
      success: true,
      message: 'Site deleted successfully',
      site_domain: site.domain,
      site_id: id,
      steps: steps,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('Error deleting site:', error);
    steps.push(`❌ Fatal hata: ${error.message}`);
    steps.push(`💡 Stack trace: ${error.stack?.substring(0, 200)}`);
    
    // Always return JSON, never HTML error page
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete site',
        message: error.message,
        steps: steps,
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
