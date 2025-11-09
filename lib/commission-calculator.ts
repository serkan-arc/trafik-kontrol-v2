/**
 * Commission Calculator Service
 * Calculates commissions based on deal types and lead status
 */

import { query } from './db'

export interface Lead {
  id: number
  tracking_id: string
  buyer_code: string
  offer_id: string
  status: string
  sale_amount?: number
  created_at: string
}

export interface Deal {
  id: number
  buyer_code: string
  offer_id: string
  deal_type: 'CPA' | 'CPL' | 'CPS' | 'HYBRID' | 'REVSHARE'
  fixed_amount?: number
  percentage?: number
  lead_commission?: number
  sale_commission?: number
  currency: string
  status: string
}

export interface Commission {
  buyer_code: string
  tracking_id: string
  deal_id: number
  commission_type: string
  commission_amount: number
  currency: string
  calculation_base?: number
  calculation_rate?: number
  calculation_method: string
  offer_id: string
  notes?: string
}

/**
 * Calculate commission for a lead based on its status and deal
 */
export async function calculateCommission(lead: Lead): Promise<Commission | null> {
  try {
    // Find active deal for this buyer and offer
    const dealResult = await query(`
      SELECT 
        id, buyer_code, offer_id, deal_type,
        fixed_amount, percentage, lead_commission, sale_commission,
        currency, status
      FROM buyer_deals
      WHERE buyer_code = $1 
        AND offer_id = $2
        AND status = 'active'
        AND (contract_end_date IS NULL OR contract_end_date >= NOW())
      ORDER BY id DESC
      LIMIT 1
    `, [lead.buyer_code, lead.offer_id])

    if (dealResult.rows.length === 0) {
      console.log(`No active deal found for buyer=${lead.buyer_code}, offer=${lead.offer_id}`)
      return null
    }

    const deal: Deal = dealResult.rows[0] as any

    // Check if commission already exists for this lead
    const existingResult = await query(`
      SELECT id 
      FROM partner_commissions 
      WHERE tracking_id = $1 
        AND deal_id = $2
        AND commission_status != 'rejected'
    `, [lead.tracking_id, deal.id])

    if (existingResult.rows.length > 0) {
      console.log(`Commission already exists for lead=${lead.tracking_id}`)
      return null
    }

    // Calculate based on deal type and lead status
    return calculateByDealType(lead, deal)

  } catch (error) {
    console.error('Commission calculation error:', error)
    throw error
  }
}

/**
 * Calculate commission based on deal type
 */
function calculateByDealType(lead: Lead, deal: Deal): Commission | null {
  switch (deal.deal_type) {
    case 'CPL':
      return calculateCPL(lead, deal)
    
    case 'CPA':
      return calculateCPA(lead, deal)
    
    case 'CPS':
      return calculateCPS(lead, deal)
    
    case 'HYBRID':
      return calculateHybrid(lead, deal)
    
    case 'REVSHARE':
      return calculateRevShare(lead, deal)
    
    default:
      console.log(`Unknown deal type: ${deal.deal_type}`)
      return null
  }
}

/**
 * CPL: Commission when lead is sent to CRM
 * Triggers: approved_for_crm, sent_to_crm
 */
function calculateCPL(lead: Lead, deal: Deal): Commission | null {
  const validStatuses = ['approved_for_crm', 'sent_to_crm', 'contacted', 'approved', 'shipped', 'delivered', 'sold']
  
  if (!validStatuses.includes(lead.status)) {
    return null
  }

  if (!deal.fixed_amount) {
    console.log('CPL deal has no fixed_amount')
    return null
  }

  return {
    buyer_code: lead.buyer_code,
    tracking_id: lead.tracking_id,
    deal_id: deal.id,
    commission_type: 'lead',
    commission_amount: Number(deal.fixed_amount),
    currency: deal.currency,
    calculation_method: 'CPL_fixed',
    offer_id: lead.offer_id,
    notes: `CPL commission for lead ${lead.tracking_id}`
  }
}

/**
 * CPA: Commission when sale is completed
 * Triggers: sold, delivered
 */
function calculateCPA(lead: Lead, deal: Deal): Commission | null {
  const validStatuses = ['sold', 'delivered']
  
  if (!validStatuses.includes(lead.status)) {
    return null
  }

  if (!deal.fixed_amount) {
    console.log('CPA deal has no fixed_amount')
    return null
  }

  return {
    buyer_code: lead.buyer_code,
    tracking_id: lead.tracking_id,
    deal_id: deal.id,
    commission_type: 'sale',
    commission_amount: Number(deal.fixed_amount),
    currency: deal.currency,
    calculation_method: 'CPA_fixed',
    offer_id: lead.offer_id,
    notes: `CPA commission for sale ${lead.tracking_id}`
  }
}

/**
 * CPS: Commission as percentage of sale amount
 * Triggers: sold
 */
function calculateCPS(lead: Lead, deal: Deal): Commission | null {
  if (lead.status !== 'sold') {
    return null
  }

  if (!deal.percentage) {
    console.log('CPS deal has no percentage')
    return null
  }

  if (!lead.sale_amount) {
    console.log('Lead has no sale_amount for CPS calculation')
    return null
  }

  const commissionAmount = (lead.sale_amount * Number(deal.percentage)) / 100

  return {
    buyer_code: lead.buyer_code,
    tracking_id: lead.tracking_id,
    deal_id: deal.id,
    commission_type: 'sale',
    commission_amount: commissionAmount,
    currency: deal.currency,
    calculation_base: lead.sale_amount,
    calculation_rate: Number(deal.percentage),
    calculation_method: 'CPS_percentage',
    offer_id: lead.offer_id,
    notes: `CPS commission: ${deal.percentage}% of ${lead.sale_amount}`
  }
}

/**
 * HYBRID: Lead commission + Sale commission
 * Two separate commissions created
 */
function calculateHybrid(lead: Lead, deal: Deal): Commission | null {
  // For hybrid, we calculate lead commission when sent to CRM
  // and sale commission when sold
  
  if (!deal.lead_commission || !deal.sale_commission) {
    console.log('HYBRID deal missing lead_commission or sale_commission')
    return null
  }

  // Lead commission
  if (['approved_for_crm', 'sent_to_crm'].includes(lead.status)) {
    return {
      buyer_code: lead.buyer_code,
      tracking_id: lead.tracking_id,
      deal_id: deal.id,
      commission_type: 'lead',
      commission_amount: Number(deal.lead_commission),
      currency: deal.currency,
      calculation_method: 'HYBRID_lead',
      offer_id: lead.offer_id,
      notes: `HYBRID lead commission for ${lead.tracking_id}`
    }
  }

  // Sale commission
  if (lead.status === 'sold') {
    return {
      buyer_code: lead.buyer_code,
      tracking_id: lead.tracking_id,
      deal_id: deal.id,
      commission_type: 'sale',
      commission_amount: Number(deal.sale_commission),
      currency: deal.currency,
      calculation_method: 'HYBRID_sale',
      offer_id: lead.offer_id,
      notes: `HYBRID sale commission for ${lead.tracking_id}`
    }
  }

  return null
}

/**
 * REVSHARE: Monthly revenue share
 * This is calculated separately via cron job
 */
function calculateRevShare(lead: Lead, deal: Deal): Commission | null {
  // REVSHARE is calculated monthly, not per lead
  // This would be handled by a separate monthly calculation job
  console.log('REVSHARE commissions are calculated monthly, not per lead')
  return null
}

/**
 * Save commission to database
 */
export async function saveCommission(commission: Commission): Promise<void> {
  try {
    await query(`
      INSERT INTO partner_commissions (
        buyer_code, tracking_id, deal_id, commission_type,
        commission_amount, currency, calculation_base, calculation_rate,
        calculation_method, offer_id, commission_status, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    `, [
      commission.buyer_code,
      commission.tracking_id,
      commission.deal_id,
      commission.commission_type,
      commission.commission_amount,
      commission.currency,
      commission.calculation_base || null,
      commission.calculation_rate || null,
      commission.calculation_method,
      commission.offer_id,
      'pending', // Default status
      commission.notes || null
    ])

    console.log(`Commission saved for lead ${commission.tracking_id}: ${commission.currency}${commission.commission_amount}`)
  } catch (error) {
    console.error('Failed to save commission:', error)
    throw error
  }
}

/**
 * Main function: Calculate and save commission for a lead
 */
export async function processLeadCommission(lead: Lead): Promise<boolean> {
  try {
    const commission = await calculateCommission(lead)
    
    if (commission) {
      await saveCommission(commission)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Process lead commission error:', error)
    return false
  }
}

/**
 * Bulk process: Calculate commissions for multiple leads
 */
export async function bulkProcessCommissions(leadIds: number[]): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const leadId of leadIds) {
    try {
      const leadResult = await query(`
        SELECT 
          id, tracking_id, buyer_code, offer_id, status,
          crm_order_id, commission_amount as sale_amount, created_at
        FROM n8n_leads
        WHERE id = $1
      `, [leadId])

      if (leadResult.rows.length > 0) {
        const lead = leadResult.rows[0] as any
        const processed = await processLeadCommission(lead)
        if (processed) {
          success++
        }
      }
    } catch (error) {
      console.error(`Failed to process lead ${leadId}:`, error)
      failed++
    }
  }

  return { success, failed }
}
