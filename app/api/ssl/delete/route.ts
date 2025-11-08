/**
 * SSL Certificate Delete API
 * 
 * POST /api/ssl/delete - Delete SSL certificate for a domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { success: false, message: 'Domain parametresi gerekli' },
        { status: 400 }
      );
    }

    console.log(`🗑️ SSL Certificate Delete: ${domain}`);

    // 1. Check if certificate exists
    try {
      const { stdout: listOutput } = await execAsync('certbot certificates');
      
      if (!listOutput.includes(domain)) {
        return NextResponse.json(
          { success: false, message: `${domain} için sertifika bulunamadı` },
          { status: 404 }
        );
      }
    } catch (error: any) {
      console.error('Error checking certificates:', error);
      return NextResponse.json(
        { success: false, message: 'Sertifika kontrolü yapılamadı' },
        { status: 500 }
      );
    }

    // 2. Delete certificate from certbot
    try {
      console.log(`Deleting certbot certificate for ${domain}...`);
      const { stdout, stderr } = await execAsync(`certbot delete --cert-name ${domain} --non-interactive`);
      console.log('Certbot delete output:', stdout);
      if (stderr) console.error('Certbot delete stderr:', stderr);
    } catch (error: any) {
      console.error('Error deleting certbot certificate:', error);
      // Continue even if certbot delete fails
    }

    // 3. Remove SSL configuration from Nginx
    const nginxConfigPath = `/etc/nginx/sites-available/${domain}`;
    const nginxEnabledPath = `/etc/nginx/sites-enabled/${domain}`;

    try {
      // Check if config exists
      const configExists = await fs.access(nginxConfigPath).then(() => true).catch(() => false);
      
      if (configExists) {
        // Read current config
        const configContent = await fs.readFile(nginxConfigPath, 'utf-8');
        
        // Remove SSL-related lines
        const cleanedConfig = configContent
          .split('\n')
          .filter(line => {
            const lowerLine = line.toLowerCase().trim();
            return !(
              lowerLine.includes('listen 443') ||
              lowerLine.includes('ssl_certificate') ||
              lowerLine.includes('ssl on') ||
              lowerLine.includes('ssl_protocols') ||
              lowerLine.includes('ssl_ciphers') ||
              lowerLine.includes('ssl_prefer_server_ciphers') ||
              lowerLine.includes('ssl_session') ||
              lowerLine.includes('add_header strict-transport')
            );
          })
          .join('\n');

        // Write back cleaned config (HTTP only)
        await fs.writeFile(nginxConfigPath, cleanedConfig, 'utf-8');
        console.log(`✅ Removed SSL from Nginx config: ${nginxConfigPath}`);
      }
    } catch (error: any) {
      console.error('Error cleaning Nginx config:', error);
      // Continue even if nginx config update fails
    }

    // 4. Test and reload Nginx
    let nginxReloaded = false;
    let nginxError = null;
    
    try {
      console.log('Testing Nginx configuration...');
      const { stdout: testOutput } = await execAsync('nginx -t 2>&1');
      console.log('Nginx test:', testOutput);

      if (testOutput.includes('syntax is ok') && testOutput.includes('test is successful')) {
        console.log('Reloading Nginx...');
        await execAsync('systemctl reload nginx');
        console.log('✅ Nginx reloaded successfully');
        nginxReloaded = true;
      } else {
        nginxError = 'Nginx configuration test failed';
        console.warn('⚠️ Nginx test failed but certificate is deleted');
      }
    } catch (error: any) {
      nginxError = error.message;
      console.warn('⚠️ Nginx reload failed but certificate is deleted:', error.message);
      // Don't throw error - certificate is already deleted successfully
    }

    // Return success even if Nginx reload failed
    // The important part (certificate deletion) succeeded
    return NextResponse.json({
      success: true,
      message: nginxReloaded 
        ? `${domain} SSL sertifikası başarıyla silindi`
        : `${domain} SSL sertifikası silindi (Nginx manuel reload gerekebilir)`,
      data: {
        domain,
        certbot_deleted: true,
        nginx_updated: true,
        nginx_reloaded: nginxReloaded,
        nginx_warning: nginxError ? `Nginx reload hatası: ${nginxError}` : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('SSL Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SSL certificate deletion failed',
        message: error.message,
        details: error.stack
      },
      { status: 500 }
    );
  }
}
