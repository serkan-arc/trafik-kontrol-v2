/**
 * Auto Rules Engine Helper Functions
 * 
 * Automatic rule execution based on IP behavior patterns
 */

import { db } from '@/lib/db';
import { updateIPStatus } from './ip-helpers';

export interface RuleCondition {
  field: string; // 'visit_count', 'form_submissions', 'same_form_spam_count', 'bot_score', 'spam_score', 'risk_score', 'time_window'
  operator: string; // '>', '<', '>=', '<=', '==', '!=', 'contains', 'not_contains'
  value: any;
  logic?: 'AND' | 'OR'; // For multiple conditions
}

export interface AutoRule {
  id?: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  action: 'whitelist' | 'graylist' | 'blacklist' | 'notify';
  redirect_version?: 'clean' | 'gray' | 'aggressive' | 'forbidden';
  priority?: number;
  enabled?: boolean;
  triggered_count?: number;
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
}

/**
 * Get all auto rules
 */
export async function getAllRules(filters?: {
  enabled?: boolean;
  action?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.enabled !== undefined) {
      conditions.push(`enabled = $${paramIndex++}`);
      params.push(filters.enabled);
    }

    if (filters?.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM auto_rules ${whereClause}`,
      params
    );

    // Get paginated results
    const dataResult = await db.query(
      `SELECT * FROM auto_rules
       ${whereClause}
       ORDER BY priority DESC, created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return {
      rules: dataResult.rows,
      meta: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  } catch (error) {
    console.error('Error in getAllRules:', error);
    throw error;
  }
}

/**
 * Get rule by ID
 */
export async function getRuleById(id: string) {
  try {
    const result = await db.query(
      'SELECT * FROM auto_rules WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Rule with ID ${id} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error in getRuleById:', error);
    throw error;
  }
}

/**
 * Create new auto rule
 */
export async function createRule(rule: AutoRule, createdBy?: string) {
  try {
    // Validate conditions
    if (!rule.conditions || rule.conditions.length === 0) {
      throw new Error('At least one condition is required');
    }

    // Validate action
    const validActions = ['whitelist', 'graylist', 'blacklist', 'notify'];
    if (!validActions.includes(rule.action)) {
      throw new Error(`Action must be one of: ${validActions.join(', ')}`);
    }

    const result = await db.query(
      `INSERT INTO auto_rules 
       (name, description, conditions, action, redirect_version, priority, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        rule.name,
        rule.description || null,
        JSON.stringify(rule.conditions),
        rule.action,
        rule.redirect_version || 'clean',
        rule.priority || 0,
        rule.enabled !== false
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error in createRule:', error);
    throw error;
  }
}

/**
 * Update existing rule
 */
export async function updateRule(id: string, updates: Partial<AutoRule>) {
  try {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }

    if (updates.conditions !== undefined) {
      setClauses.push(`conditions = $${paramIndex++}`);
      params.push(JSON.stringify(updates.conditions));
    }

    if (updates.action !== undefined) {
      setClauses.push(`action = $${paramIndex++}`);
      params.push(updates.action);
    }

    if (updates.redirect_version !== undefined) {
      setClauses.push(`redirect_version = $${paramIndex++}`);
      params.push(updates.redirect_version);
    }

    if (updates.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      params.push(updates.priority);
    }

    if (updates.enabled !== undefined) {
      setClauses.push(`enabled = $${paramIndex++}`);
      params.push(updates.enabled);
    }

    setClauses.push(`updated_at = NOW()`);

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);

    const result = await db.query(
      `UPDATE auto_rules
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error(`Rule with ID ${id} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error in updateRule:', error);
    throw error;
  }
}

/**
 * Delete rule
 */
export async function deleteRule(id: string) {
  try {
    const result = await db.query(
      'DELETE FROM auto_rules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Rule with ID ${id} not found`);
    }

    return { success: true, message: `Rule ${id} deleted` };
  } catch (error) {
    console.error('Error in deleteRule:', error);
    throw error;
  }
}

/**
 * Evaluate conditions for an IP
 */
export async function evaluateConditions(conditions: RuleCondition[], ip: string): Promise<boolean> {
  try {
    // Get IP data
    const result = await db.query(
      `SELECT * FROM ip_tracking WHERE ip = $1`,
      [ip]
    );

    if (result.rows.length === 0) {
      return false; // IP not found
    }

    const ipData = result.rows[0];

    // Evaluate each condition
    let overallResult = true;
    let currentLogic: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const fieldValue = ipData[condition.field];
      let conditionResult = false;

      // Evaluate based on operator
      switch (condition.operator) {
        case '>':
          conditionResult = fieldValue > condition.value;
          break;
        case '<':
          conditionResult = fieldValue < condition.value;
          break;
        case '>=':
          conditionResult = fieldValue >= condition.value;
          break;
        case '<=':
          conditionResult = fieldValue <= condition.value;
          break;
        case '==':
          conditionResult = fieldValue == condition.value;
          break;
        case '!=':
          conditionResult = fieldValue != condition.value;
          break;
        case 'contains':
          conditionResult = String(fieldValue).includes(String(condition.value));
          break;
        case 'not_contains':
          conditionResult = !String(fieldValue).includes(String(condition.value));
          break;
        default:
          throw new Error(`Unknown operator: ${condition.operator}`);
      }

      // Apply logic
      if (currentLogic === 'AND') {
        overallResult = overallResult && conditionResult;
      } else {
        overallResult = overallResult || conditionResult;
      }

      // Set logic for next condition
      currentLogic = condition.logic || 'AND';
    }

    return overallResult;
  } catch (error) {
    console.error('Error in evaluateConditions:', error);
    throw error;
  }
}

/**
 * Test rule against an IP
 */
export async function testRule(ruleId: string, ip: string) {
  try {
    const rule = await getRuleById(ruleId);
    
    const matches = await evaluateConditions(rule.conditions, ip);

    return {
      rule_id: ruleId,
      rule_name: rule.name,
      ip,
      matches,
      would_execute: matches && rule.enabled,
      action: rule.action,
      redirect_version: rule.redirect_version,
      conditions_evaluated: rule.conditions
    };
  } catch (error) {
    console.error('Error in testRule:', error);
    throw error;
  }
}

/**
 * Execute rule for an IP
 */
export async function executeRule(ruleId: string, ip: string, adminUserId?: string) {
  try {
    const rule = await getRuleById(ruleId);

    if (!rule.enabled) {
      throw new Error(`Rule ${ruleId} is not enabled`);
    }

    // Evaluate conditions
    const matches = await evaluateConditions(rule.conditions, ip);

    if (!matches) {
      return {
        executed: false,
        reason: 'Conditions not met',
        rule_id: ruleId,
        ip
      };
    }

    // Execute action
    if (rule.action === 'notify') {
      // Just log, don't change IP status
      await db.query(
        `UPDATE auto_rules SET triggered_count = triggered_count + 1 WHERE id = $1`,
        [ruleId]
      );

      return {
        executed: true,
        action: 'notify',
        message: `Rule ${rule.name} triggered for IP ${ip}`,
        rule_id: ruleId,
        ip
      };
    } else {
      // Update IP status
      await updateIPStatus(
        ip,
        rule.action as 'whitelist' | 'graylist' | 'blacklist',
        rule.redirect_version || 'clean',
        adminUserId || 'auto-rule',
        `Auto-rule: ${rule.name} - ${rule.description || 'N/A'}`
      );

      // Increment triggered count
      await db.query(
        `UPDATE auto_rules SET triggered_count = triggered_count + 1 WHERE id = $1`,
        [ruleId]
      );

      return {
        executed: true,
        action: rule.action,
        redirect_version: rule.redirect_version,
        message: `IP ${ip} added to ${rule.action} by rule: ${rule.name}`,
        rule_id: ruleId,
        ip
      };
    }
  } catch (error) {
    console.error('Error in executeRule:', error);
    throw error;
  }
}

/**
 * Get available condition fields
 */
export function getAvailableConditions() {
  return {
    fields: [
      { name: 'visit_count', type: 'number', description: 'Total visit count' },
      { name: 'form_submissions', type: 'number', description: 'Total form submissions' },
      { name: 'same_form_spam_count', type: 'number', description: 'Same form spam count' },
      { name: 'bot_score', type: 'number', description: 'Bot detection score (0-100)' },
      { name: 'spam_score', type: 'number', description: 'Spam detection score (0-100)' },
      { name: 'risk_score', type: 'number', description: 'Overall risk score (0-100)' },
      { name: 'country', type: 'string', description: 'Country code (e.g., US, TR)' },
      { name: 'device_type', type: 'string', description: 'Device type (pc, mobile)' },
      { name: 'list_status', type: 'string', description: 'Current list status' }
    ],
    operators: {
      number: ['>', '<', '>=', '<=', '==', '!='],
      string: ['==', '!=', 'contains', 'not_contains']
    },
    actions: [
      { value: 'whitelist', label: 'Add to Whitelist', description: 'Trusted IPs' },
      { value: 'graylist', label: 'Add to Graylist', description: 'Suspicious IPs' },
      { value: 'blacklist', label: 'Add to Blacklist', description: 'Blocked IPs' },
      { value: 'notify', label: 'Notify Only', description: 'Log without action' }
    ],
    redirect_versions: [
      { value: 'clean', label: 'Clean Site', description: 'Normal site version' },
      { value: 'gray', label: 'Gray Site', description: 'Slightly modified version' },
      { value: 'aggressive', label: 'Aggressive Site', description: 'Heavily modified version' },
      { value: 'forbidden', label: 'Forbidden', description: '403 Forbidden page' }
    ]
  };
}

/**
 * Validate rule configuration
 */
export function validateRuleConfig(rule: Partial<AutoRule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check name
  if (!rule.name || rule.name.trim().length === 0) {
    errors.push('Rule name is required');
  }

  // Check conditions
  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push('At least one condition is required');
  } else {
    const validFields = ['visit_count', 'form_submissions', 'same_form_spam_count', 'bot_score', 'spam_score', 'risk_score', 'country', 'device_type', 'list_status'];
    const validOperators = ['>', '<', '>=', '<=', '==', '!=', 'contains', 'not_contains'];

    rule.conditions.forEach((condition, index) => {
      if (!validFields.includes(condition.field)) {
        errors.push(`Condition ${index + 1}: Invalid field "${condition.field}"`);
      }

      if (!validOperators.includes(condition.operator)) {
        errors.push(`Condition ${index + 1}: Invalid operator "${condition.operator}"`);
      }

      if (condition.value === undefined || condition.value === null) {
        errors.push(`Condition ${index + 1}: Value is required`);
      }
    });
  }

  // Check action
  const validActions = ['whitelist', 'graylist', 'blacklist', 'notify'];
  if (!rule.action || !validActions.includes(rule.action)) {
    errors.push(`Action must be one of: ${validActions.join(', ')}`);
  }

  // Check redirect_version if action is not notify
  if (rule.action && rule.action !== 'notify') {
    const validVersions = ['clean', 'gray', 'aggressive', 'forbidden'];
    if (rule.redirect_version && !validVersions.includes(rule.redirect_version)) {
      errors.push(`Redirect version must be one of: ${validVersions.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
