#!/usr/bin/env node

/**
 * Enhanced Nginx Log Parser for Traffic Control System v2
 * Features:
 * - Global IP Reputation tracking
 * - Auto Rules checking and enforcement
 * - Bot Detection with pattern matching
 * - Spam Detection
 * - Security Event detection
 * - IP Activity aggregation
 */

const { Pool } = require('pg');
const fs = require('fs');
const readline = require('readline');
const { Tail } = require('tail');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres.dtekai.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dtektracking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s',
  max: 20,
});

// Cache for rules and patterns (refresh every 5 minutes)
let cachedRules = [];
let cachedBotPatterns = [];
let cachedSpamPatterns = [];
let lastCacheRefresh = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Nginx log regex pattern
const logPattern = /^(\S+) - - \[(.*?)\] "(.*?)" (\d+) (\d+) "(.*?)" "(.*?)"$/;

// Suspicious path patterns
const suspiciousPaths = [
  '/wp-admin', '/wp-login.php', '/xmlrpc.php',
  '/.env', '/.git', '/config.php', '/phpMyAdmin',
  '/admin', '/administrator', '/phpmyadmin',
  '/.well-known', '/api/config', '/backup'
];

// Parse single log line
function parseLogLine(line) {
  const match = line.match(logPattern);
  if (!match) return null;
  
  return {
    ip: match[1],
    timestamp: match[2],
    request: match[3],
    status: parseInt(match[4]),
    size: parseInt(match[5]),
    referer: match[6] === '-' ? null : match[6],
    userAgent: match[7]
  };
}

// Extract path and method from request
function extractRequestInfo(request) {
  const parts = request.split(' ');
  return {
    method: parts[0] || 'GET',
    path: parts[1] || '/',
    protocol: parts[2] || 'HTTP/1.1'
  };
}

// Refresh cache from database
async function refreshCache() {
  const now = Date.now();
  if (now - lastCacheRefresh < CACHE_TTL) return;

  try {
    // Load auto rules
    const rulesResult = await pool.query(`
      SELECT * FROM global_auto_rules 
      WHERE enabled = true 
      ORDER BY priority DESC
    `);
    cachedRules = rulesResult.rows;

    // Load bot patterns
    const botResult = await pool.query(`
      SELECT * FROM global_bot_patterns 
      WHERE enabled = true
    `);
    cachedBotPatterns = botResult.rows;

    // Load spam patterns
    const spamResult = await pool.query(`
      SELECT * FROM global_spam_patterns 
      WHERE enabled = true
    `);
    cachedSpamPatterns = spamResult.rows;

    lastCacheRefresh = now;
    console.log(`✓ Cache refreshed: ${cachedRules.length} rules, ${cachedBotPatterns.length} bot patterns, ${cachedSpamPatterns.length} spam patterns`);
  } catch (error) {
    console.error('Error refreshing cache:', error.message);
  }
}

// Check if path is suspicious
function isSuspiciousPath(path) {
  return suspiciousPaths.some(pattern => path.toLowerCase().includes(pattern.toLowerCase()));
}

// Detect bot from user agent
function detectBot(userAgent) {
  for (const pattern of cachedBotPatterns) {
    for (const uaPattern of pattern.user_agent_patterns) {
      const regex = new RegExp(uaPattern, 'i');
      if (regex.test(userAgent)) {
        return {
          matched: true,
          pattern: pattern,
          botName: pattern.bot_name,
          botType: pattern.bot_type,
          score: pattern.bot_type === 'bad' ? 80 : 20,
          action: pattern.recommended_action
        };
      }
    }
  }
  return { matched: false, score: 0 };
}

// Check auto rules
function checkAutoRules(domain, ip, path, userAgent) {
  const triggeredRules = [];

  for (const rule of cachedRules) {
    // Check if rule applies to this domain
    if (rule.apply_to === 'specific' && !rule.domain_list.includes(domain)) continue;
    if (rule.apply_to === 'exclude' && rule.domain_list.includes(domain)) continue;

    let triggered = false;
    const conditions = rule.conditions;

    // Check rule type
    switch (rule.rule_type) {
      case 'path_blocking':
        if (conditions.paths && Array.isArray(conditions.paths)) {
          triggered = conditions.paths.some(p => path.includes(p));
        }
        break;

      case 'user_agent':
        if (conditions.patterns && Array.isArray(conditions.patterns)) {
          triggered = conditions.patterns.some(p => {
            const regex = new RegExp(p, 'i');
            return regex.test(userAgent);
          });
        }
        break;

      case 'ip_range':
        if (conditions.ip_pattern) {
          const regex = new RegExp(conditions.ip_pattern);
          triggered = regex.test(ip);
        }
        break;
    }

    if (triggered) {
      triggeredRules.push(rule);
    }
  }

  return triggeredRules;
}

// Calculate IP reputation score
function calculateReputationScore(ipData, logData, botDetection, suspiciousPath) {
  let score = ipData.reputation_score || 50; // Start from current score or 50

  // Increase score for suspicious activity (higher = worse)
  if (suspiciousPath) score += 5;
  if (botDetection.matched && botDetection.botType === 'bad') score += 10;
  if (logData.status >= 400) score += 2;

  // Decrease score for good behavior (lower = better)
  if (botDetection.matched && botDetection.botType === 'good') score -= 5;
  if (logData.status === 200) score -= 1;

  // Keep score in range 0-100
  score = Math.max(0, Math.min(100, score));

  return score;
}

// Upsert global IP reputation
async function upsertIPReputation(ip, domain, logData, botDetection, suspiciousPath) {
  try {
    // Get current IP data
    const currentIP = await pool.query(`
      SELECT * FROM global_ip_reputation WHERE ip = $1
    `, [ip]);

    let reputationScore = 50;
    let listType = 'unknown';
    let classificationReason = [];

    if (currentIP.rows.length > 0) {
      const ipData = currentIP.rows[0];
      reputationScore = calculateReputationScore(ipData, logData, botDetection, suspiciousPath);
      
      // Auto-classify based on score
      if (reputationScore < 30) {
        listType = 'whitelist';
      } else if (reputationScore >= 70) {
        listType = 'blacklist';
        classificationReason = ipData.classification_reason || [];
        if (suspiciousPath) {
          classificationReason.push({
            reason: 'suspicious_path_access',
            weight: 5,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        listType = 'graylist';
      }
    }

    // Upsert IP reputation
    await pool.query(`
      INSERT INTO global_ip_reputation (
        ip, reputation_score, list_type, total_requests, 
        suspicious_requests, domains_visited, first_seen_at, 
        last_seen_at, classification_reason, auto_classified
      ) VALUES (
        $1, $2, $3, 1, $4, ARRAY[$5], NOW(), NOW(), $6, true
      )
      ON CONFLICT (ip) DO UPDATE SET
        reputation_score = $2,
        list_type = $3,
        total_requests = global_ip_reputation.total_requests + 1,
        suspicious_requests = global_ip_reputation.suspicious_requests + $4,
        domains_visited = array_append(
          CASE WHEN $5 = ANY(global_ip_reputation.domains_visited) 
          THEN global_ip_reputation.domains_visited 
          ELSE global_ip_reputation.domains_visited 
          END, $5
        ),
        last_seen_at = NOW(),
        classification_reason = $6,
        last_updated_at = NOW()
    `, [
      ip,
      reputationScore,
      listType,
      suspiciousPath ? 1 : 0,
      domain,
      JSON.stringify(classificationReason)
    ]);

    return { reputationScore, listType };
  } catch (error) {
    console.error('Error upserting IP reputation:', error.message);
    return { reputationScore: 50, listType: 'unknown' };
  }
}

// Log IP activity (hourly aggregation)
async function logIPActivity(ip, domain, botScore, triggeredRules) {
  try {
    const hourTimestamp = new Date();
    hourTimestamp.setMinutes(0, 0, 0);

    await pool.query(`
      INSERT INTO global_ip_activity (
        ip, domain, hour_timestamp, request_count, 
        suspicious_count, bot_score, triggered_rules
      ) VALUES ($1, $2, $3, 1, $4, $5, $6)
      ON CONFLICT (ip, domain, hour_timestamp) DO UPDATE SET
        request_count = global_ip_activity.request_count + 1,
        suspicious_count = global_ip_activity.suspicious_count + $4,
        bot_score = ($5 + global_ip_activity.bot_score) / 2,
        triggered_rules = array_cat(global_ip_activity.triggered_rules, $6),
        updated_at = NOW()
    `, [
      ip,
      domain,
      hourTimestamp,
      triggeredRules.length > 0 ? 1 : 0,
      botScore,
      triggeredRules.map(r => r.id)
    ]);
  } catch (error) {
    console.error('Error logging IP activity:', error.message);
  }
}

// Log bot detection
async function logBotDetection(ip, domain, userAgent, botDetection) {
  if (!botDetection.matched) return;

  try {
    await pool.query(`
      INSERT INTO global_bot_detections (
        ip, domain, user_agent, is_bot, bot_name, bot_type,
        bot_score, detection_method, matched_pattern_id, action, blocked
      ) VALUES ($1, $2, $3, true, $4, $5, $6, 'user_agent', $7, $8, $9)
    `, [
      ip,
      domain,
      userAgent,
      botDetection.botName,
      botDetection.botType,
      botDetection.score,
      botDetection.pattern.id,
      botDetection.action,
      botDetection.action === 'block'
    ]);

    // Update pattern statistics
    await pool.query(`
      UPDATE global_bot_patterns
      SET detection_count = detection_count + 1,
          last_detected_at = NOW()
      WHERE id = $1
    `, [botDetection.pattern.id]);
  } catch (error) {
    console.error('Error logging bot detection:', error.message);
  }
}

// Log rule triggers
async function logRuleTriggers(ip, domain, path, userAgent, triggeredRules) {
  for (const rule of triggeredRules) {
    try {
      await pool.query(`
        INSERT INTO global_rule_triggers (
          rule_id, rule_name, ip, domain, path, user_agent, action, blocked
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        rule.id,
        rule.rule_name,
        ip,
        domain,
        path,
        userAgent,
        rule.action,
        rule.action === 'block' || rule.action === 'drop'
      ]);

      // Update rule statistics
      await pool.query(`
        UPDATE global_auto_rules
        SET triggered_count = triggered_count + 1,
            last_triggered_at = NOW(),
            blocked_requests = blocked_requests + $2,
            challenged_requests = challenged_requests + $3
        WHERE id = $1
      `, [
        rule.id,
        (rule.action === 'block' || rule.action === 'drop') ? 1 : 0,
        rule.action === 'challenge' ? 1 : 0
      ]);
    } catch (error) {
      console.error('Error logging rule trigger:', error.message);
    }
  }
}

// Main processing function
async function processLogEntry(domain, logData) {
  const { method, path } = extractRequestInfo(logData.request);
  const { ip, userAgent, status } = logData;

  try {
    // Refresh cache if needed
    await refreshCache();

    // 1. Check if path is suspicious
    const suspiciousPath = isSuspiciousPath(path);

    // 2. Detect bot
    const botDetection = detectBot(userAgent);

    // 3. Check auto rules
    const triggeredRules = checkAutoRules(domain, ip, path, userAgent);

    // 4. Update global IP reputation
    const ipReputation = await upsertIPReputation(ip, domain, logData, botDetection, suspiciousPath);

    // 5. Log IP activity (hourly aggregation)
    await logIPActivity(ip, domain, botDetection.score, triggeredRules);

    // 6. Log bot detection
    if (botDetection.matched) {
      await logBotDetection(ip, domain, userAgent, botDetection);
    }

    // 7. Log rule triggers
    if (triggeredRules.length > 0) {
      await logRuleTriggers(ip, domain, path, userAgent, triggeredRules);
    }

    // 8. Insert into domain-specific traffic_logs
    const schema = domain.replace(/\./g, '_');
    await pool.query(`
      INSERT INTO "${schema}_traffic_logs" (
        ip_address, path, method, status_code, user_agent, referer, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT DO NOTHING
    `, [ip, path, method, status, userAgent, logData.referer]);

    // 9. Update domain-specific IP addresses
    await pool.query(`
      INSERT INTO "${schema}_ip_addresses" (
        ip_address, list_type, risk_score, first_seen, last_seen
      ) VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (ip_address) DO UPDATE SET 
        list_type = $2,
        risk_score = $3,
        last_seen = NOW()
    `, [ip, ipReputation.listType, ipReputation.reputationScore]);

    // 10. Log to console
    const flags = [];
    if (suspiciousPath) flags.push('⚠️ SUSPICIOUS');
    if (botDetection.matched) flags.push(`🤖 ${botDetection.botType.toUpperCase()}`);
    if (triggeredRules.length > 0) flags.push(`⚙️ ${triggeredRules.length} RULES`);
    if (ipReputation.listType === 'blacklist') flags.push('🔴 BLACKLIST');

    console.log(`${ip} -> ${domain}${path} [${status}] ${flags.join(' ')}`);

  } catch (error) {
    console.error('Error processing log entry:', error.message);
  }
}

// Process log file
async function processLogFile(logFile, domain) {
  console.log(`📁 Processing logs for ${domain} from ${logFile}`);
  
  if (!fs.existsSync(logFile)) {
    console.error(`❌ Log file not found: ${logFile}`);
    return;
  }

  // Process existing lines (skip for now, only tail new ones)
  console.log(`👀 Watching for new entries...`);
  
  const tail = new Tail(logFile, {
    follow: true,
    useWatchFile: true
  });

  tail.on('line', async (line) => {
    const logData = parseLogLine(line);
    if (logData) {
      await processLogEntry(domain, logData);
    }
  });

  tail.on('error', (error) => {
    console.error('❌ Tail error:', error);
  });
}

// Get all active domains
async function getActiveDomains() {
  try {
    const result = await pool.query(`
      SELECT domain, db_schema 
      FROM master_domains 
      WHERE status = 'active'
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching domains:', error);
    return [];
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Enhanced Nginx Log Parser v2');
  console.log('Features: IP Reputation | Auto Rules | Bot Detection | Security Events');
  console.log('');

  // Initial cache load
  await refreshCache();

  // Get active domains
  const domains = await getActiveDomains();
  console.log(`✓ Found ${domains.length} active domain(s)`);
  
  if (domains.length === 0) {
    console.log('⚠️  No active domains found. Add domains to master_domains table.');
    process.exit(1);
  }

  // Process each domain's logs
  for (const domain of domains) {
    const logFile = `/var/log/nginx/${domain.domain}_access.log`;
    processLogFile(logFile, domain.domain);
  }
  
  // Refresh cache periodically
  setInterval(refreshCache, CACHE_TTL);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    pool.end();
    process.exit(0);
  });

  console.log('✓ Parser is running. Press Ctrl+C to stop.\n');
}

// Start the parser
main().catch(console.error);
