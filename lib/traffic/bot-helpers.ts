/**
 * Bot Detection Helper Functions
 * 
 * DNS verification for legitimate bots (Google, Facebook, etc.)
 */

import { promisify } from 'util';
import * as dns from 'dns';
import { db } from '@/lib/db';

const reverseDNS = promisify(dns.reverse);
const resolveDNS = promisify(dns.resolve4);

export interface BotVerificationResult {
  verified: boolean;
  hostname?: string;
  forward_ip?: string;
  bot_type?: string;
  reason?: string;
}

/**
 * Verify if IP is a legitimate bot using DNS verification
 */
export async function verifyBot(ip: string, userAgent: string): Promise<BotVerificationResult> {
  try {
    // Check if user agent claims to be a bot
    const botPatterns = [
      { pattern: /googlebot/i, type: 'google', domains: ['.googlebot.com', '.google.com'] },
      { pattern: /bingbot/i, type: 'bing', domains: ['.search.msn.com'] },
      { pattern: /facebookexternalhit/i, type: 'facebook', domains: ['.facebook.com', '.fbsv.net'] },
      { pattern: /twitterbot/i, type: 'twitter', domains: ['.twttr.com'] },
      { pattern: /linkedinbot/i, type: 'linkedin', domains: ['.linkedin.com'] },
    ];

    // Find matching bot pattern
    const botMatch = botPatterns.find(bp => bp.pattern.test(userAgent));
    
    if (!botMatch) {
      return {
        verified: false,
        reason: 'User agent does not match known bots'
      };
    }

    // Perform reverse DNS lookup
    let hostnames: string[];
    try {
      hostnames = await reverseDNS(ip);
    } catch (error) {
      return {
        verified: false,
        bot_type: botMatch.type,
        reason: 'Reverse DNS lookup failed - FAKE BOT!'
      };
    }

    if (!hostnames || hostnames.length === 0) {
      return {
        verified: false,
        bot_type: botMatch.type,
        reason: 'No hostname found - FAKE BOT!'
      };
    }

    const hostname = hostnames[0];

    // Verify hostname ends with expected domain
    const validDomain = botMatch.domains.some(domain => hostname.endsWith(domain));
    
    if (!validDomain) {
      return {
        verified: false,
        hostname,
        bot_type: botMatch.type,
        reason: `Hostname ${hostname} does not match expected domains - FAKE BOT!`
      };
    }

    // Perform forward DNS lookup to verify
    let forwardIPs: string[];
    try {
      forwardIPs = await resolveDNS(hostname);
    } catch (error) {
      return {
        verified: false,
        hostname,
        bot_type: botMatch.type,
        reason: 'Forward DNS lookup failed'
      };
    }

    // Check if original IP matches forward lookup
    if (!forwardIPs.includes(ip)) {
      return {
        verified: false,
        hostname,
        forward_ip: forwardIPs[0],
        bot_type: botMatch.type,
        reason: 'Forward DNS does not match original IP - FAKE BOT!'
      };
    }

    // Bot is verified!
    return {
      verified: true,
      hostname,
      forward_ip: ip,
      bot_type: botMatch.type
    };

  } catch (error) {
    console.error('Error in verifyBot:', error);
    return {
      verified: false,
      reason: 'Verification error'
    };
  }
}

/**
 * Record bot verification result in database
 */
export async function recordBotVerification(
  ip: string,
  userAgent: string,
  verificationResult: BotVerificationResult
): Promise<void> {
  try {
    // Get or create IP tracking
    const ipResult = await db.query(
      'SELECT id FROM ip_tracking WHERE ip = $1',
      [ip]
    );

    let ipTrackingId = ipResult.rows[0]?.id;

    if (!ipTrackingId) {
      const insertResult = await db.query(
        'INSERT INTO ip_tracking (ip) VALUES ($1) RETURNING id',
        [ip]
      );
      ipTrackingId = insertResult.rows[0].id;
    }

    // Check if user agent already recorded
    const existingUA = await db.query(
      'SELECT id FROM ip_user_agent_history WHERE ip = $1 AND user_agent = $2',
      [ip, userAgent]
    );

    if (existingUA.rows.length > 0) {
      // Update existing record
      await db.query(
        `UPDATE ip_user_agent_history 
         SET last_seen = NOW(),
             visit_count_with_this_ua = visit_count_with_this_ua + 1,
             is_bot = $1,
             bot_type = $2,
             dns_hostname = $3,
             dns_verified = $4,
             dns_check_date = NOW()
         WHERE id = $5`,
        [
          verificationResult.verified || verificationResult.bot_type !== undefined,
          verificationResult.bot_type,
          verificationResult.hostname,
          verificationResult.verified,
          existingUA.rows[0].id
        ]
      );
    } else {
      // Insert new record
      await db.query(
        `INSERT INTO ip_user_agent_history 
         (ip, user_agent, is_bot, claims_to_be_bot, bot_type, dns_hostname, dns_verified, dns_check_date, ip_tracking_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
        [
          ip,
          userAgent,
          verificationResult.verified || verificationResult.bot_type !== undefined,
          verificationResult.bot_type !== undefined,
          verificationResult.bot_type,
          verificationResult.hostname,
          verificationResult.verified,
          ipTrackingId
        ]
      );
    }

    // Update bot score in ip_tracking
    if (!verificationResult.verified && verificationResult.bot_type) {
      // Fake bot detected - increase bot score
      await db.query(
        `UPDATE ip_tracking 
         SET bot_score = LEAST(bot_score + 30, 100)
         WHERE ip = $1`,
        [ip]
      );
    }

  } catch (error) {
    console.error('Error in recordBotVerification:', error);
    throw error;
  }
}

/**
 * Get bot statistics
 */
export async function getBotStats() {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_bot = true AND dns_verified = true) as verified_bots,
        COUNT(*) FILTER (WHERE is_bot = true AND dns_verified = false) as fake_bots,
        COUNT(*) FILTER (WHERE claims_to_be_bot = true AND dns_verified = false) as suspicious_bots,
        COUNT(DISTINCT bot_type) FILTER (WHERE dns_verified = true) as bot_types,
        COUNT(*) as total_records
      FROM ip_user_agent_history
    `);

    return result.rows[0];
  } catch (error) {
    console.error('Error in getBotStats:', error);
    throw error;
  }
}

/**
 * Get list of fake bot detections
 */
export async function getFakeBots(limit: number = 50) {
  try {
    const result = await db.query(
      `SELECT 
        uah.ip,
        uah.user_agent,
        uah.bot_type,
        uah.dns_hostname,
        uah.dns_verified,
        uah.dns_check_date,
        uah.visit_count_with_this_ua,
        it.country,
        it.list_status
       FROM ip_user_agent_history uah
       LEFT JOIN ip_tracking it ON uah.ip = it.ip
       WHERE uah.claims_to_be_bot = true 
         AND uah.dns_verified = false
       ORDER BY uah.dns_check_date DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error in getFakeBots:', error);
    throw error;
  }
}

/**
 * Get allowed bot configuration
 */
export async function getAllowedBots() {
  // This is a simple in-memory configuration for now
  // In production, this could be stored in database or config file
  return [
    { pattern: 'googlebot', type: 'google', domains: ['.googlebot.com', '.google.com'], enabled: true },
    { pattern: 'bingbot', type: 'bing', domains: ['.search.msn.com'], enabled: true },
    { pattern: 'facebookexternalhit', type: 'facebook', domains: ['.facebook.com', '.fbsv.net'], enabled: true },
    { pattern: 'twitterbot', type: 'twitter', domains: ['.twttr.com'], enabled: true },
    { pattern: 'linkedinbot', type: 'linkedin', domains: ['.linkedin.com'], enabled: true },
    { pattern: 'slackbot', type: 'slack', domains: ['.slack.com'], enabled: true },
    { pattern: 'whatsapp', type: 'whatsapp', domains: ['.whatsapp.net'], enabled: true },
    { pattern: 'telegrambot', type: 'telegram', domains: ['.telegram.org'], enabled: true },
  ];
}

/**
 * Update allowed bot configuration
 */
export async function updateAllowedBots(botType: string, enabled: boolean) {
  // For now, we'll just validate the bot type exists
  const allowedBots = await getAllowedBots();
  const bot = allowedBots.find(b => b.type === botType);
  
  if (!bot) {
    throw new Error(`Bot type ${botType} not found`);
  }

  // In production, this would update database or config file
  // For now, just return success
  return { success: true, botType, enabled };
}

/**
 * Report fake bot detection
 */
export async function reportFakeBot(ip: string, userAgent: string, reportedBy: string, notes?: string) {
  try {
    // First, verify the bot
    const verification = await verifyBot(ip, userAgent);
    
    // Record the verification
    await recordBotVerification(ip, userAgent, verification);
    
    // If it's a fake bot, add admin note
    if (!verification.verified && verification.bot_type) {
      await db.query(
        `UPDATE ip_tracking 
         SET admin_notes = COALESCE(admin_notes || E'\n\n', '') || $1,
             manual_decision = true
         WHERE ip = $2`,
        [
          `[FAKE BOT REPORT ${new Date().toISOString()}]\nReported by: ${reportedBy}\nUser Agent: ${userAgent}\nReason: ${verification.reason}\nNotes: ${notes || 'N/A'}`,
          ip
        ]
      );
      
      // Consider adding to graylist or blacklist
      await db.query(
        `UPDATE ip_tracking 
         SET list_status = CASE 
           WHEN list_status = 'unknown' THEN 'graylist'
           ELSE list_status
         END
         WHERE ip = $1`,
        [ip]
      );
    }
    
    return {
      success: true,
      ip,
      verification,
      action: !verification.verified ? 'Added to graylist' : 'No action needed (verified bot)'
    };
    
  } catch (error) {
    console.error('Error in reportFakeBot:', error);
    throw error;
  }
}
