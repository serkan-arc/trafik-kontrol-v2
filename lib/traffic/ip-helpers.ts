/**
 * IP Tracking Helper Functions
 * 
 * Utility functions for IP tracking, risk scoring, and status management
 */

import { db } from '@/lib/db';

export interface IPTrackingData {
  id?: bigint;
  ip: string;
  country?: string;
  country_name?: string;
  city?: string;
  isp?: string;
  device_type?: string;
  os?: string;
  browser?: string;
  visit_count?: number;
  first_seen?: Date;
  last_seen?: Date;
  form_submissions?: number;
  same_form_spam_count?: number;
  risk_score?: number;
  bot_score?: number;
  spam_score?: number;
  list_status?: 'whitelist' | 'graylist' | 'blacklist' | 'unknown';
  redirect_version?: 'clean' | 'gray' | 'aggressive';
  admin_notes?: string;
  manual_decision?: boolean;
  admin_user_id?: string;
  decision_date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Get or create IP tracking record
 */
export async function getOrCreateIPTracking(ip: string): Promise<IPTrackingData> {
  try {
    // Try to get existing record
    const existingResult = await db.query<IPTrackingData>(
      'SELECT * FROM ip_tracking WHERE ip = $1',
      [ip]
    );

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0];
    }

    // Create new record
    const insertResult = await db.query<IPTrackingData>(
      `INSERT INTO ip_tracking (ip, list_status, redirect_version)
       VALUES ($1, 'unknown', 'clean')
       RETURNING *`,
      [ip]
    );

    return insertResult.rows[0];
  } catch (error) {
    console.error('Error in getOrCreateIPTracking:', error);
    throw error;
  }
}

/**
 * Update IP visit count and last seen
 */
export async function updateIPVisit(ip: string): Promise<void> {
  try {
    await db.query(
      `UPDATE ip_tracking 
       SET visit_count = visit_count + 1,
           last_seen = NOW()
       WHERE ip = $1`,
      [ip]
    );
  } catch (error) {
    console.error('Error in updateIPVisit:', error);
    throw error;
  }
}

/**
 * Calculate risk score based on multiple factors
 */
export async function calculateRiskScore(ip: string): Promise<number> {
  try {
    const result = await db.query<IPTrackingData>(
      `SELECT 
        visit_count,
        form_submissions,
        same_form_spam_count,
        bot_score,
        spam_score,
        list_status
       FROM ip_tracking
       WHERE ip = $1`,
      [ip]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    const data = result.rows[0];
    let riskScore = 0;

    // Factor 1: Spam score (0-40 points)
    riskScore += (data.spam_score || 0) * 0.4;

    // Factor 2: Bot score (0-30 points)
    riskScore += (data.bot_score || 0) * 0.3;

    // Factor 3: Same form spam count (0-30 points)
    if ((data.same_form_spam_count || 0) >= 5) {
      riskScore += 30;
    } else if ((data.same_form_spam_count || 0) >= 3) {
      riskScore += 20;
    } else if ((data.same_form_spam_count || 0) >= 1) {
      riskScore += 10;
    }

    // Factor 4: List status adjustment
    if (data.list_status === 'blacklist') {
      riskScore = 100; // Max risk
    } else if (data.list_status === 'whitelist') {
      riskScore = Math.min(riskScore, 20); // Cap at low risk
    }

    // Cap between 0-100
    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

    // Update in database
    await db.query(
      'UPDATE ip_tracking SET risk_score = $1 WHERE ip = $2',
      [riskScore, ip]
    );

    return riskScore;
  } catch (error) {
    console.error('Error in calculateRiskScore:', error);
    throw error;
  }
}

/**
 * Update IP list status (whitelist/graylist/blacklist)
 */
export async function updateIPStatus(
  ip: string,
  status: 'whitelist' | 'graylist' | 'blacklist',
  redirectVersion: 'clean' | 'gray' | 'aggressive',
  adminUserId?: string,
  notes?: string
): Promise<void> {
  try {
    // Get current status
    const currentResult = await db.query(
      'SELECT list_status FROM ip_tracking WHERE ip = $1',
      [ip]
    );

    const oldStatus = currentResult.rows[0]?.list_status || 'unknown';

    // Update status
    await db.query(
      `UPDATE ip_tracking 
       SET list_status = $1,
           redirect_version = $2,
           manual_decision = true,
           admin_user_id = $3,
           admin_notes = $4,
           decision_date = NOW()
       WHERE ip = $5`,
      [status, redirectVersion, adminUserId, notes, ip]
    );

    // Log decision history
    await db.query(
      `INSERT INTO ip_decision_history 
       (ip, old_status, new_status, redirect_version, decision_type, notes, admin_user_id, admin_username)
       VALUES ($1, $2, $3, $4, 'manual', $5, $6, $7)`,
      [ip, oldStatus, status, redirectVersion, notes, adminUserId, 'admin']
    );

    // Recalculate risk score
    await calculateRiskScore(ip);
  } catch (error) {
    console.error('Error in updateIPStatus:', error);
    throw error;
  }
}

/**
 * Get IP journey (all visits)
 */
export async function getIPJourney(ip: string, limit: number = 100) {
  try {
    const result = await db.query(
      `SELECT 
        visit_timestamp,
        page_url,
        page_title,
        device_type,
        time_on_page,
        scroll_depth,
        clicks_count,
        is_bot
       FROM ip_visit_history
       WHERE ip = $1
       ORDER BY visit_timestamp DESC
       LIMIT $2`,
      [ip, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error in getIPJourney:', error);
    throw error;
  }
}

/**
 * Get IPs that need manual review
 */
export async function getIPsForReview(limit: number = 50) {
  try {
    const result = await db.query(
      `SELECT 
        ip,
        country,
        device_type,
        visit_count,
        form_submissions,
        same_form_spam_count,
        risk_score,
        bot_score,
        spam_score,
        list_status,
        last_seen
       FROM ip_tracking
       WHERE list_status = 'unknown'
         AND (risk_score >= 50 OR same_form_spam_count >= 2)
       ORDER BY risk_score DESC, last_seen DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error in getIPsForReview:', error);
    throw error;
  }
}

/**
 * Search IPs with filters
 */
export interface IPSearchFilters {
  status?: 'whitelist' | 'graylist' | 'blacklist' | 'unknown';
  minRiskScore?: number;
  maxRiskScore?: number;
  country?: string;
  deviceType?: string;
  hasFormSpam?: boolean;
  page?: number;
  limit?: number;
}

export async function searchIPs(filters: IPSearchFilters) {
  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`list_status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.minRiskScore !== undefined) {
      conditions.push(`risk_score >= $${paramIndex++}`);
      params.push(filters.minRiskScore);
    }

    if (filters.maxRiskScore !== undefined) {
      conditions.push(`risk_score <= $${paramIndex++}`);
      params.push(filters.maxRiskScore);
    }

    if (filters.country) {
      conditions.push(`country = $${paramIndex++}`);
      params.push(filters.country);
    }

    if (filters.deviceType) {
      conditions.push(`device_type = $${paramIndex++}`);
      params.push(filters.deviceType);
    }

    if (filters.hasFormSpam) {
      conditions.push(`same_form_spam_count > 0`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM ip_tracking ${whereClause}`,
      params
    );

    // Get paginated results
    const dataResult = await db.query(
      `SELECT * FROM ip_tracking
       ${whereClause}
       ORDER BY last_seen DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return {
      ips: dataResult.rows,
      meta: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  } catch (error) {
    console.error('Error in searchIPs:', error);
    throw error;
  }
}

/**
 * Remove IP from a specific list
 */
export async function removeIPFromList(ip: string, listType: 'whitelist' | 'graylist' | 'blacklist') {
  try {
    // Check if IP exists and is in the specified list
    const result = await db.query(
      'SELECT list_status FROM ip_tracking WHERE ip = $1',
      [ip]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`IP ${ip} not found`);
    }
    
    if (result.rows[0].list_status !== listType) {
      throw new Error(`IP ${ip} is not in ${listType}`);
    }
    
    // Update to unknown status
    await db.query(
      `UPDATE ip_tracking 
       SET list_status = 'unknown',
           redirect_version = 'clean',
           manual_decision = false,
           updated_at = NOW()
       WHERE ip = $1`,
      [ip]
    );
    
    return { success: true, message: `IP ${ip} removed from ${listType}` };
  } catch (error) {
    console.error('Error in removeIPFromList:', error);
    throw error;
  }
}

/**
 * Bulk import IPs
 */
export async function bulkImportIPs(
  ips: string[],
  listStatus: 'whitelist' | 'graylist' | 'blacklist',
  redirectVersion: 'clean' | 'gray' | 'aggressive' = 'clean',
  adminUserId?: string,
  notes?: string
) {
  try {
    const results = {
      successful: [] as string[],
      failed: [] as { ip: string; reason: string }[]
    };
    
    for (const ip of ips) {
      try {
        // Validate IP format (simple check)
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && !/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip)) {
          results.failed.push({ ip, reason: 'Invalid IP format' });
          continue;
        }
        
        await updateIPStatus(ip, listStatus, redirectVersion, adminUserId, notes);
        results.successful.push(ip);
      } catch (error: any) {
        results.failed.push({ ip, reason: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in bulkImportIPs:', error);
    throw error;
  }
}

/**
 * Export IP list
 */
export async function exportIPList(listType: 'whitelist' | 'graylist' | 'blacklist', format: 'json' | 'csv' = 'json') {
  try {
    const result = await db.query(
      `SELECT 
        ip,
        country,
        device_type,
        visit_count,
        form_submissions,
        risk_score,
        redirect_version,
        admin_notes,
        created_at,
        updated_at
       FROM ip_tracking
       WHERE list_status = $1
       ORDER BY updated_at DESC`,
      [listType]
    );
    
    if (format === 'csv') {
      // Convert to CSV format
      const headers = ['IP', 'Country', 'Device Type', 'Visit Count', 'Form Submissions', 'Risk Score', 'Redirect Version', 'Notes', 'Created At', 'Updated At'];
      const rows = result.rows.map(row => [
        row.ip,
        row.country || '',
        row.device_type || '',
        row.visit_count || 0,
        row.form_submissions || 0,
        row.risk_score || 0,
        row.redirect_version || 'clean',
        (row.admin_notes || '').replace(/"/g, '""'),
        row.created_at,
        row.updated_at
      ]);
      
      return {
        format: 'csv',
        headers,
        data: rows,
        count: rows.length
      };
    }
    
    return {
      format: 'json',
      data: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    console.error('Error in exportIPList:', error);
    throw error;
  }
}

/**
 * Move IP between lists
 */
export async function moveIPBetweenLists(
  ip: string,
  fromList: 'whitelist' | 'graylist' | 'blacklist' | 'unknown',
  toList: 'whitelist' | 'graylist' | 'blacklist' | 'unknown',
  redirectVersion?: 'clean' | 'gray' | 'aggressive',
  adminUserId?: string,
  notes?: string
) {
  try {
    // Verify IP is in fromList
    const result = await db.query(
      'SELECT list_status FROM ip_tracking WHERE ip = $1',
      [ip]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`IP ${ip} not found`);
    }
    
    if (result.rows[0].list_status !== fromList) {
      throw new Error(`IP ${ip} is not in ${fromList} (current: ${result.rows[0].list_status})`);
    }
    
    // Move to new list (but not to 'unknown')
    if (toList === 'unknown') {
      throw new Error('Cannot move IP to "unknown" status. Use whitelist, graylist, or blacklist.');
    }
    
    await updateIPStatus(
      ip,
      toList,
      redirectVersion || 'clean',
      adminUserId,
      notes || `Moved from ${fromList} to ${toList}`
    );
    
    return {
      success: true,
      message: `IP ${ip} moved from ${fromList} to ${toList}`,
      ip,
      from: fromList,
      to: toList
    };
  } catch (error) {
    console.error('Error in moveIPBetweenLists:', error);
    throw error;
  }
}
