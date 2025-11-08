import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

interface SSLCertificate {
  domain: string;
  domains: string[];
  expires_at: string;
  issued_at: string | null;
  days_remaining: number;
  status: 'valid' | 'expiring_soon' | 'expired';
  cert_path: string;
  key_path: string;
  serial_number: string;
}

/**
 * GET /api/ssl/scan
 * Scan all SSL certificates from certbot
 */
export async function GET(request: NextRequest) {
  try {
    // Get all certificates from certbot
    const certbotOutput = execSync('sudo certbot certificates 2>/dev/null', {
      encoding: 'utf-8'
    });

    const certificates: SSLCertificate[] = [];
    const lines = certbotOutput.split('\n');
    
    let currentCert: Partial<SSLCertificate> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('Certificate Name:')) {
        // Save previous cert if exists
        if (currentCert.domain) {
          certificates.push(currentCert as SSLCertificate);
        }
        
        // Start new cert
        currentCert = {
          domain: trimmed.split('Certificate Name:')[1].trim()
        };
      } else if (trimmed.startsWith('Domains:')) {
        const domainsStr = trimmed.split('Domains:')[1].trim();
        currentCert.domains = domainsStr.split(' ');
      } else if (trimmed.startsWith('Expiry Date:')) {
        const expiryMatch = trimmed.match(/Expiry Date: (.+?) \(VALID: (\d+) days?\)/);
        if (expiryMatch) {
          currentCert.expires_at = expiryMatch[1];
          currentCert.days_remaining = parseInt(expiryMatch[2]);
          
          // Determine status
          if (currentCert.days_remaining < 0) {
            currentCert.status = 'expired';
          } else if (currentCert.days_remaining < 30) {
            currentCert.status = 'expiring_soon';
          } else {
            currentCert.status = 'valid';
          }
        }
      } else if (trimmed.startsWith('Certificate Path:')) {
        currentCert.cert_path = trimmed.split('Certificate Path:')[1].trim();
      } else if (trimmed.startsWith('Private Key Path:')) {
        currentCert.key_path = trimmed.split('Private Key Path:')[1].trim();
      } else if (trimmed.startsWith('Serial Number:')) {
        currentCert.serial_number = trimmed.split('Serial Number:')[1].trim();
      }
    }
    
    // Add last cert
    if (currentCert.domain) {
      certificates.push(currentCert as SSLCertificate);
    }

    // Calculate stats
    const stats = {
      total: certificates.length,
      valid: certificates.filter(c => c.status === 'valid').length,
      expiring_soon: certificates.filter(c => c.status === 'expiring_soon').length,
      expired: certificates.filter(c => c.status === 'expired').length,
    };

    return NextResponse.json({
      success: true,
      certificates,
      stats
    });
  } catch (error: any) {
    console.error('Error scanning SSL certificates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scan SSL certificates',
        message: error.message
      },
      { status: 500 }
    );
  }
}
