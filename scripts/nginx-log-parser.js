#!/usr/bin/env node

/**
 * Nginx Log Parser for Traffic Control System
 * Reads nginx access logs and writes to database
 */

const { Pool } = require('pg');
const fs = require('fs');
const readline = require('readline');
const { Tail } = require('tail');

// Database connection
const pool = new Pool({
  host: 'postgres.dtekai.com',
  port: 5432,
  database: 'dtektracking',
  user: 'postgres',
  password: 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s',
  max: 10,
});

// Nginx log regex pattern
const logPattern = /^(\S+) - - \[(.*?)\] "(.*?)" (\d+) (\d+) "(.*?)" "(.*?)"$/;

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

// Extract path from request
function extractPath(request) {
  const parts = request.split(' ');
  return parts[1] || '/';
}

// Insert traffic log into database
async function insertTrafficLog(domain, logData) {
  const schema = domain.replace(/\./g, '_');
  
  try {
    // Insert into traffic_logs
    await pool.query(`
      INSERT INTO "${schema}_traffic_logs" (
        ip_address,
        path,
        method,
        status_code,
        user_agent,
        referer,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT DO NOTHING
    `, [
      logData.ip,
      extractPath(logData.request),
      logData.request.split(' ')[0] || 'GET',
      logData.status,
      logData.userAgent,
      logData.referer
    ]);

    // Update or insert IP address info
    await pool.query(`
      INSERT INTO "${schema}_ip_addresses" (
        ip_address,
        list_type,
        risk_score,
        first_seen,
        last_seen
      ) VALUES ($1, 'unknown', 0, NOW(), NOW())
      ON CONFLICT (ip_address) 
      DO UPDATE SET last_seen = NOW()
    `, [logData.ip]);

    // Check for bot patterns
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper',
      'googlebot', 'bingbot', 'yandex', 'baidu',
      'HeadlessChrome', 'PhantomJS'
    ];
    
    const isBot = botPatterns.some(pattern => 
      logData.userAgent.toLowerCase().includes(pattern.toLowerCase())
    );

    if (isBot) {
      await pool.query(`
        INSERT INTO "${schema}_bot_detections" (
          ip_address,
          bot_type,
          detection_method,
          is_fake,
          confidence_score,
          created_at
        ) VALUES ($1, 'crawler', 'user_agent', false, 0.8, NOW())
        ON CONFLICT DO NOTHING
      `, [logData.ip]);
    }

    console.log(`✓ Processed: ${logData.ip} -> ${extractPath(logData.request)}`);
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

// Process log file
async function processLogFile(logFile, domain) {
  console.log(`Processing logs for ${domain} from ${logFile}`);
  
  // Check if file exists
  if (!fs.existsSync(logFile)) {
    console.error(`Log file not found: ${logFile}`);
    return;
  }

  // First, process existing lines
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    const logData = parseLogLine(line);
    if (logData) {
      await insertTrafficLog(domain, logData);
      count++;
    }
  }
  
  console.log(`✓ Processed ${count} existing log entries`);

  // Then tail for new entries
  console.log(`Watching for new entries...`);
  const tail = new Tail(logFile);

  tail.on('line', async (line) => {
    const logData = parseLogLine(line);
    if (logData) {
      await insertTrafficLog(domain, logData);
    }
  });

  tail.on('error', (error) => {
    console.error('Tail error:', error);
  });
}

// Get all active domains from database
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
  console.log('🚀 Starting Nginx Log Parser for Traffic Control');
  
  // Get active domains
  const domains = await getActiveDomains();
  console.log(`Found ${domains.length} active domain(s)`);
  
  // Process each domain's logs
  for (const domain of domains) {
    const logFile = `/var/log/nginx/${domain.domain}_access.log`;
    processLogFile(logFile, domain.domain);
  }
  
  // Keep process running
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    pool.end();
    process.exit(0);
  });
}

// Start the parser
main().catch(console.error);