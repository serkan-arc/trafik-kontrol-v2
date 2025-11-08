// Station 2: SSL Management API
// Manage SSL certificates for deployed sites

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SSLManager } from '@/lib/ssl-manager';
import { NginxGenerator } from '@/lib/nginx-generator';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sites/[id]/ssl
 * Get SSL certificate status for a site
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get site information and SSL certificate
    const result = await db.query(
      `SELECT ds.domain, ds.ssl_enabled, ds.ssl_expires_at,
              sc.id as cert_id, sc.status, sc.issued_at, sc.expires_at,
              sc.cert_path, sc.key_path, sc.fullchain_path, sc.auto_renew
       FROM deployed_sites ds
       LEFT JOIN ssl_certificates sc ON sc.site_id = ds.id
       WHERE ds.id = $1`,
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

    const site = result.rows[0];

    // Check certificate expiry
    let expiryInfo = null;
    if (site.domain) {
      expiryInfo = await SSLManager.checkExpiry(site.domain);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...site,
        expiryInfo
      }
    });
  } catch (error: any) {
    console.error('Error fetching SSL status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch SSL status',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sites/[id]/ssl
 * Request or renew SSL certificate
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, email } = body; // 'request', 'renew', 'test'

    if (!action || !['request', 'renew', 'test'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be one of: request, renew, test'
        },
        { status: 400 }
      );
    }

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

    if (action === 'test') {
      const testResult = await SSLManager.testSSLConfig(site.domain);
      return NextResponse.json({
        success: testResult.success,
        message: testResult.message,
        grade: testResult.grade
      });
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required for SSL certificate operations'
        },
        { status: 400 }
      );
    }

    let result;

    if (action === 'request') {
      // Request new certificate
      result = await SSLManager.requestCertificate(
        site.domain,
        email,
        site.site_type === 'static' ? site.file_path : undefined
      );

      if (result.success && result.certificate) {
        // Update site SSL information
        await db.query(
          'UPDATE deployed_sites SET ssl_enabled = true, ssl_expires_at = $1 WHERE id = $2',
          [result.certificate.expiresAt, id]
        );

        // Check if certificate record exists
        const existingCert = await db.query(
          'SELECT id FROM ssl_certificates WHERE site_id = $1',
          [id]
        );

        if (existingCert.rows.length > 0) {
          // Update existing record
          await db.query(
            `UPDATE ssl_certificates 
             SET cert_path = $1, key_path = $2, fullchain_path = $3, 
                 status = $4, issued_at = $5, expires_at = $6, updated_at = NOW()
             WHERE site_id = $7`,
            [
              result.certificate.certPath,
              result.certificate.keyPath,
              result.certificate.fullchainPath,
              'active',
              result.certificate.issuedAt,
              result.certificate.expiresAt,
              id
            ]
          );
        } else {
          // Insert new record
          await db.query(
            `INSERT INTO ssl_certificates 
             (site_id, domain, cert_path, key_path, fullchain_path, status, issued_at, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              id,
              site.domain,
              result.certificate.certPath,
              result.certificate.keyPath,
              result.certificate.fullchainPath,
              'active',
              result.certificate.issuedAt,
              result.certificate.expiresAt
            ]
          );
        }

        // Update NGINX configuration with SSL
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
          sslEnabled: true,
          sslCertPath: result.certificate.fullchainPath,
          sslKeyPath: result.certificate.keyPath,
          filePath: site.file_path
        });

        await NginxGenerator.writeConfig(site.domain, nginxConfig);
        await NginxGenerator.reloadNginx();
      }

    } else if (action === 'renew') {
      // Renew existing certificate
      result = await SSLManager.renewCertificate(site.domain);

      if (result.success) {
        // Get updated certificate info
        const certInfo = await SSLManager.getCertificateInfo(site.domain);
        
        if (certInfo) {
          // Update database
          await db.query(
            'UPDATE deployed_sites SET ssl_expires_at = $1 WHERE id = $2',
            [certInfo.expiresAt, id]
          );

          await db.query(
            `UPDATE ssl_certificates 
             SET status = $1, issued_at = $2, expires_at = $3, 
                 last_renewal_attempt = NOW(), updated_at = NOW()
             WHERE site_id = $4`,
            ['active', certInfo.issuedAt, certInfo.expiresAt, id]
          );
        }

        // Reload NGINX to apply new certificate
        await NginxGenerator.reloadNginx();
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be "request" or "renew"'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result?.success || false,
      message: result?.message || 'Operation completed',
      certificate: (result as any)?.certificate
    });

  } catch (error: any) {
    console.error('Error managing SSL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to manage SSL certificate',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sites/[id]/ssl
 * Revoke and delete SSL certificate
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get site information
    const siteResult = await db.query(
      'SELECT domain FROM deployed_sites WHERE id = $1',
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

    // Revoke certificate
    const revokeResult = await SSLManager.revokeCertificate(site.domain);
    
    if (!revokeResult.success) {
      console.warn(`Failed to revoke certificate: ${revokeResult.message}`);
    }

    // Delete certificate
    await SSLManager.deleteCertificate(site.domain);

    // Update database
    await db.query(
      'UPDATE deployed_sites SET ssl_enabled = false, ssl_expires_at = NULL WHERE id = $1',
      [id]
    );

    await db.query(
      'DELETE FROM ssl_certificates WHERE site_id = $1',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'SSL certificate removed successfully'
    });

  } catch (error: any) {
    console.error('Error deleting SSL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete SSL certificate',
        message: error.message
      },
      { status: 500 }
    );
  }
}
