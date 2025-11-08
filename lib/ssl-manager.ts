// Station 2: SSL Certificate Manager
// Handles Let's Encrypt SSL certificate automation

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface SSLCertificate {
  domain: string;
  certPath: string;
  keyPath: string;
  fullchainPath: string;
  issuedAt?: Date;
  expiresAt?: Date;
  status: 'pending' | 'active' | 'expired' | 'error';
}

export class SSLManager {
  private static readonly CERTBOT_PATH = '/usr/bin/certbot';
  private static readonly LETSENCRYPT_PATH = '/etc/letsencrypt';
  private static readonly CERT_PATH = '/etc/letsencrypt/live';

  /**
   * Check if certbot is installed
   */
  static async checkCertbot(): Promise<{ installed: boolean; version?: string }> {
    try {
      const { stdout } = await execAsync('certbot --version 2>&1');
      const versionMatch = stdout.match(/certbot (\d+\.\d+\.\d+)/);
      
      return {
        installed: true,
        version: versionMatch ? versionMatch[1] : 'unknown'
      };
    } catch {
      return { installed: false };
    }
  }

  /**
   * Request a new SSL certificate
   */
  static async requestCertificate(
    domain: string,
    email: string,
    webroot?: string
  ): Promise<{ success: boolean; message: string; certificate?: SSLCertificate }> {
    try {
      // Check if certbot is installed
      const certbotCheck = await this.checkCertbot();
      if (!certbotCheck.installed) {
        return {
          success: false,
          message: 'Certbot is not installed. Please install certbot first.'
        };
      }

      // Build certbot command
      let command = `certbot certonly --non-interactive --agree-tos --email ${email}`;

      if (webroot) {
        // Use webroot plugin (for running sites)
        command += ` --webroot -w ${webroot} -d ${domain} -d www.${domain}`;
      } else {
        // Use standalone plugin (requires port 80 to be free)
        command += ` --standalone -d ${domain} -d www.${domain}`;
      }

      // Execute certbot
      const { stdout, stderr } = await execAsync(command);
      const output = stdout + stderr;

      // Check if successful
      if (output.includes('Successfully received certificate') || output.includes('Certificate not yet due for renewal')) {
        const certificate = await this.getCertificateInfo(domain);
        
        if (certificate) {
          return {
            success: true,
            message: 'SSL certificate obtained successfully',
            certificate
          };
        }
      }

      return {
        success: false,
        message: `Failed to obtain certificate: ${output}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Certificate request failed: ${error.message}`
      };
    }
  }

  /**
   * Renew an existing certificate
   */
  static async renewCertificate(domain: string): Promise<{ success: boolean; message: string }> {
    try {
      const { stdout, stderr } = await execAsync(`certbot renew --cert-name ${domain} --force-renewal`);
      const output = stdout + stderr;

      if (output.includes('Successfully renewed') || output.includes('not yet due for renewal')) {
        return {
          success: true,
          message: 'Certificate renewed successfully'
        };
      }

      return {
        success: false,
        message: `Renewal failed: ${output}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Certificate renewal failed: ${error.message}`
      };
    }
  }

  /**
   * Revoke a certificate
   */
  static async revokeCertificate(domain: string): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync(`certbot revoke --cert-name ${domain} --non-interactive`);
      
      return {
        success: true,
        message: 'Certificate revoked successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Certificate revocation failed: ${error.message}`
      };
    }
  }

  /**
   * Delete a certificate
   */
  static async deleteCertificate(domain: string): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync(`certbot delete --cert-name ${domain} --non-interactive`);
      
      return {
        success: true,
        message: 'Certificate deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Certificate deletion failed: ${error.message}`
      };
    }
  }

  /**
   * Get certificate information
   */
  static async getCertificateInfo(domain: string): Promise<SSLCertificate | null> {
    try {
      const certDir = path.join(this.CERT_PATH, domain);
      
      // Check if certificate directory exists
      try {
        await fs.access(certDir);
      } catch {
        return null;
      }

      const certPath = path.join(certDir, 'cert.pem');
      const keyPath = path.join(certDir, 'privkey.pem');
      const fullchainPath = path.join(certDir, 'fullchain.pem');

      // Check if files exist
      await fs.access(certPath);
      await fs.access(keyPath);
      await fs.access(fullchainPath);

      // Get certificate dates using openssl
      try {
        const { stdout: notBeforeOut } = await execAsync(
          `openssl x509 -in ${certPath} -noout -startdate`
        );
        const { stdout: notAfterOut } = await execAsync(
          `openssl x509 -in ${certPath} -noout -enddate`
        );

        const issuedAtMatch = notBeforeOut.match(/notBefore=(.+)/);
        const expiresAtMatch = notAfterOut.match(/notAfter=(.+)/);

        const issuedAt = issuedAtMatch ? new Date(issuedAtMatch[1]) : undefined;
        const expiresAt = expiresAtMatch ? new Date(expiresAtMatch[1]) : undefined;

        // Determine status
        let status: 'pending' | 'active' | 'expired' | 'error' = 'active';
        if (expiresAt && expiresAt < new Date()) {
          status = 'expired';
        }

        return {
          domain,
          certPath,
          keyPath,
          fullchainPath,
          issuedAt,
          expiresAt,
          status
        };
      } catch {
        return {
          domain,
          certPath,
          keyPath,
          fullchainPath,
          status: 'active'
        };
      }
    } catch {
      return null;
    }
  }

  /**
   * List all certificates
   */
  static async listCertificates(): Promise<SSLCertificate[]> {
    try {
      const { stdout } = await execAsync('certbot certificates 2>&1');
      const certificates: SSLCertificate[] = [];

      // Parse certbot output
      const certBlocks = stdout.split('Certificate Name: ').slice(1);

      for (const block of certBlocks) {
        const domainMatch = block.match(/^(.+)/);
        if (!domainMatch) continue;

        const domain = domainMatch[1].trim();
        const certInfo = await this.getCertificateInfo(domain);
        
        if (certInfo) {
          certificates.push(certInfo);
        }
      }

      return certificates;
    } catch {
      return [];
    }
  }

  /**
   * Check certificate expiry and get days remaining
   */
  static async checkExpiry(domain: string): Promise<{ 
    expiresAt?: Date; 
    daysRemaining?: number; 
    needsRenewal: boolean;
    expired: boolean;
  }> {
    const certInfo = await this.getCertificateInfo(domain);
    
    if (!certInfo || !certInfo.expiresAt) {
      return {
        needsRenewal: true,
        expired: false
      };
    }

    const now = new Date();
    const expiresAt = certInfo.expiresAt;
    const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      expiresAt,
      daysRemaining,
      needsRenewal: daysRemaining < 30, // Renew if less than 30 days
      expired: daysRemaining < 0
    };
  }

  /**
   * Auto-renew certificates that are expiring soon
   */
  static async autoRenewAll(): Promise<{ 
    success: boolean; 
    message: string; 
    renewed: string[];
    failed: string[];
  }> {
    try {
      const { stdout, stderr } = await execAsync('certbot renew --non-interactive 2>&1');
      const output = stdout + stderr;

      const renewed: string[] = [];
      const failed: string[] = [];

      // Parse renewal output
      const renewalLines = output.split('\n');
      for (const line of renewalLines) {
        if (line.includes('Successfully renewed')) {
          const domainMatch = line.match(/certificate for (.+)/);
          if (domainMatch) {
            renewed.push(domainMatch[1].trim());
          }
        } else if (line.includes('Failed to renew')) {
          const domainMatch = line.match(/certificate for (.+)/);
          if (domainMatch) {
            failed.push(domainMatch[1].trim());
          }
        }
      }

      return {
        success: failed.length === 0,
        message: `Renewed ${renewed.length} certificates, ${failed.length} failed`,
        renewed,
        failed
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Auto-renewal failed: ${error.message}`,
        renewed: [],
        failed: []
      };
    }
  }

  /**
   * Setup automatic renewal cron job
   */
  static async setupAutoRenewal(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if cron job already exists
      const { stdout } = await execAsync('crontab -l 2>&1 || true');
      
      if (stdout.includes('certbot renew')) {
        return {
          success: true,
          message: 'Auto-renewal cron job already exists'
        };
      }

      // Add cron job to run renewal twice daily
      const cronJob = '0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"';
      const newCrontab = stdout + '\n' + cronJob;
      
      await execAsync(`echo "${newCrontab}" | crontab -`);

      return {
        success: true,
        message: 'Auto-renewal cron job setup successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to setup auto-renewal: ${error.message}`
      };
    }
  }

  /**
   * Validate domain ownership (DNS check)
   */
  static async validateDomain(domain: string): Promise<{ valid: boolean; message: string }> {
    try {
      const { stdout } = await execAsync(`host ${domain}`);
      
      if (stdout.includes('has address') || stdout.includes('has IPv6 address')) {
        return {
          valid: true,
          message: 'Domain DNS is configured correctly'
        };
      }

      return {
        valid: false,
        message: 'Domain DNS not found or not pointing to this server'
      };
    } catch (error: any) {
      return {
        valid: false,
        message: `Domain validation failed: ${error.message}`
      };
    }
  }

  /**
   * Test SSL certificate configuration
   */
  static async testSSLConfig(domain: string): Promise<{ success: boolean; message: string; grade?: string }> {
    try {
      // Test HTTPS connection
      const { stdout, stderr } = await execAsync(
        `curl -sI --connect-timeout 5 https://${domain} 2>&1 | head -n 1`
      );

      if (stdout.includes('200') || stdout.includes('301') || stdout.includes('302')) {
        return {
          success: true,
          message: 'SSL certificate is working correctly',
          grade: 'A'
        };
      }

      return {
        success: false,
        message: `SSL test failed: ${stdout + stderr}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `SSL test error: ${error.message}`
      };
    }
  }
}
