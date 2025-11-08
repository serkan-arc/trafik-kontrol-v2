/**
 * Form Spam Detection Helpers
 */

import { createHash } from 'crypto';
import { db } from '@/lib/db';

export interface SpamCheckResult {
  is_spam: boolean;
  spam_score: number;
  spam_reasons: string[];
  action: 'allow' | 'graylist' | 'blacklist' | 'manual_review';
}

/**
 * Check if form submission is spam
 */
export async function checkFormSpam(
  ip: string,
  formName: string,
  formData: any,
  timeToFill: number
): Promise<SpamCheckResult> {
  try {
    const spamReasons: string[] = [];
    let spamScore = 0;
    let isSpam = false;

    // Create data hash
    const dataHash = createHash('sha256').update(JSON.stringify(formData)).digest('hex');

    // Check 1: Same form multiple times in 24 hours
    const sameFormResult = await db.query(
      `SELECT COUNT(*) as count 
       FROM form_submission_history
       WHERE ip = $1 
         AND form_name = $2 
         AND submitted_at > NOW() - INTERVAL '24 hours'`,
      [ip, formName]
    );

    const sameFormCount = parseInt(sameFormResult.rows[0].count);

    if (sameFormCount >= 5) {
      spamReasons.push('same_form_5x_24h');
      spamScore += 40;
      isSpam = true;
    } else if (sameFormCount >= 3) {
      spamReasons.push('same_form_3x_24h');
      spamScore += 30;
      isSpam = true;
    } else if (sameFormCount >= 2) {
      spamReasons.push('same_form_2x_24h');
      spamScore += 15;
    }

    // Check 2: Same data submitted before
    const sameDataResult = await db.query(
      `SELECT COUNT(*) as count
       FROM form_submission_history
       WHERE ip = $1 AND data_hash = $2`,
      [ip, dataHash]
    );

    const sameDataCount = parseInt(sameDataResult.rows[0].count);

    if (sameDataCount > 0) {
      spamReasons.push('duplicate_data');
      spamScore += 25;
      isSpam = true;
    }

    // Check 3: Too fast submission
    if (timeToFill < 3) {
      spamReasons.push('filled_too_fast_3s');
      spamScore += 35;
      isSpam = true;
    } else if (timeToFill < 5) {
      spamReasons.push('filled_too_fast_5s');
      spamScore += 20;
    }

    // Determine action
    let action: SpamCheckResult['action'] = 'allow';
    
    if (spamScore >= 80) {
      action = 'blacklist';
    } else if (spamScore >= 50) {
      action = 'graylist';
    } else if (spamScore >= 30) {
      action = 'manual_review';
    }

    return {
      is_spam: isSpam,
      spam_score: Math.min(spamScore, 100),
      spam_reasons: spamReasons,
      action
    };

  } catch (error) {
    console.error('Error in checkFormSpam:', error);
    throw error;
  }
}

/**
 * Record form submission
 */
export async function recordFormSubmission(
  ip: string,
  formName: string,
  formData: any,
  timeToFill: number,
  spamCheck: SpamCheckResult
): Promise<void> {
  try {
    const dataHash = createHash('sha256').update(JSON.stringify(formData)).digest('hex');

    // Get IP tracking ID
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

    // Count same form in 24h
    const countResult = await db.query(
      `SELECT COUNT(*) as count 
       FROM form_submission_history
       WHERE ip = $1 AND form_name = $2 
         AND submitted_at > NOW() - INTERVAL '24 hours'`,
      [ip, formName]
    );

    const sameFormCount24h = parseInt(countResult.rows[0].count) + 1;

    // Insert form submission
    await db.query(
      `INSERT INTO form_submission_history
       (ip, form_name, data_hash, time_to_fill, is_spam, spam_score, 
        spam_reasons, same_form_count_24h, action_taken, ip_tracking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        ip,
        formName,
        dataHash,
        timeToFill,
        spamCheck.is_spam,
        spamCheck.spam_score,
        JSON.stringify(spamCheck.spam_reasons),
        sameFormCount24h,
        spamCheck.action,
        ipTrackingId
      ]
    );

    // Update ip_tracking spam counts
    if (spamCheck.is_spam) {
      await db.query(
        `UPDATE ip_tracking 
         SET form_submissions = form_submissions + 1,
             same_form_spam_count = same_form_spam_count + 1,
             spam_score = LEAST(spam_score + $1, 100)
         WHERE ip = $2`,
        [spamCheck.spam_score / 2, ip]
      );
    } else {
      await db.query(
        `UPDATE ip_tracking 
         SET form_submissions = form_submissions + 1
         WHERE ip = $1`,
        [ip]
      );
    }

  } catch (error) {
    console.error('Error in recordFormSubmission:', error);
    throw error;
  }
}

/**
 * Get spam statistics
 */
export async function getSpamStats() {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE is_spam = true) as spam_count,
        COUNT(*) FILTER (WHERE action_taken = 'blacklist') as blacklist_actions,
        COUNT(*) FILTER (WHERE action_taken = 'graylist') as graylist_actions,
        COUNT(*) FILTER (WHERE action_taken = 'manual_review') as manual_review_needed,
        AVG(spam_score) FILTER (WHERE is_spam = true) as avg_spam_score
      FROM form_submission_history
      WHERE submitted_at > NOW() - INTERVAL '7 days'
    `);

    return result.rows[0];
  } catch (error) {
    console.error('Error in getSpamStats:', error);
    throw error;
  }
}

/**
 * Get form submissions for specific IP
 */
export async function getIPFormSubmissions(ip: string, limit: number = 50) {
  try {
    const result = await db.query(
      `SELECT 
        id,
        form_name,
        time_to_fill,
        is_spam,
        spam_score,
        spam_reasons,
        same_form_count_24h,
        action_taken,
        submitted_at
       FROM form_submission_history
       WHERE ip = $1
       ORDER BY submitted_at DESC
       LIMIT $2`,
      [ip, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error in getIPFormSubmissions:', error);
    throw error;
  }
}

/**
 * Report spam submission
 */
export async function reportSpam(
  ip: string,
  formName: string,
  submissionId?: number,
  reportedBy?: string,
  notes?: string
) {
  try {
    // If submission ID provided, update it
    if (submissionId) {
      await db.query(
        `UPDATE form_submission_history
         SET is_spam = true,
             action_taken = 'manual_review',
             spam_reasons = COALESCE(spam_reasons, '[]'::jsonb) || '["manually_reported"]'::jsonb
         WHERE id = $1`,
        [submissionId]
      );
    }

    // Add admin note to IP
    await db.query(
      `UPDATE ip_tracking 
       SET admin_notes = COALESCE(admin_notes || E'\n\n', '') || $1,
           manual_decision = true,
           spam_score = LEAST(spam_score + 25, 100)
       WHERE ip = $2`,
      [
        `[SPAM REPORT ${new Date().toISOString()}]\nForm: ${formName}\nReported by: ${reportedBy || 'unknown'}\nNotes: ${notes || 'Manual spam report'}`,
        ip
      ]
    );

    // Consider adding to graylist
    await db.query(
      `UPDATE ip_tracking 
       SET list_status = CASE 
         WHEN list_status = 'unknown' AND spam_score >= 50 THEN 'graylist'
         WHEN spam_score >= 80 THEN 'blacklist'
         ELSE list_status
       END
       WHERE ip = $1`,
      [ip]
    );

    return {
      success: true,
      message: 'Spam report submitted',
      ip,
      form_name: formName
    };
  } catch (error) {
    console.error('Error in reportSpam:', error);
    throw error;
  }
}

/**
 * Get spam patterns analysis
 */
export async function getSpamPatterns(days: number = 7) {
  try {
    // Get most targeted forms
    const formsResult = await db.query(`
      SELECT 
        form_name,
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE is_spam = true) as spam_count,
        ROUND(COUNT(*) FILTER (WHERE is_spam = true)::numeric * 100 / COUNT(*), 2) as spam_percentage
      FROM form_submission_history
      WHERE submitted_at > NOW() - INTERVAL '${days} days'
      GROUP BY form_name
      ORDER BY spam_count DESC
      LIMIT 10
    `);

    // Get most common spam reasons
    const reasonsResult = await db.query(`
      SELECT 
        jsonb_array_elements_text(spam_reasons) as reason,
        COUNT(*) as count
      FROM form_submission_history
      WHERE is_spam = true 
        AND submitted_at > NOW() - INTERVAL '${days} days'
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get time distribution (hour of day)
    const timeDistResult = await db.query(`
      SELECT 
        EXTRACT(HOUR FROM submitted_at) as hour,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_spam = true) as spam_count
      FROM form_submission_history
      WHERE submitted_at > NOW() - INTERVAL '${days} days'
      GROUP BY EXTRACT(HOUR FROM submitted_at)
      ORDER BY hour
    `);

    // Get top spam IPs
    const topSpamIPsResult = await db.query(`
      SELECT 
        ip,
        COUNT(*) as spam_submissions,
        COUNT(DISTINCT form_name) as forms_targeted,
        AVG(spam_score) as avg_spam_score
      FROM form_submission_history
      WHERE is_spam = true 
        AND submitted_at > NOW() - INTERVAL '${days} days'
      GROUP BY ip
      ORDER BY spam_submissions DESC
      LIMIT 10
    `);

    return {
      most_targeted_forms: formsResult.rows,
      common_spam_reasons: reasonsResult.rows,
      hourly_distribution: timeDistResult.rows,
      top_spam_ips: topSpamIPsResult.rows,
      analysis_period: `${days} days`
    };
  } catch (error) {
    console.error('Error in getSpamPatterns:', error);
    throw error;
  }
}
