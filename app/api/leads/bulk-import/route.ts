/**
 * Bulk Lead Import API
 * POST /api/leads/bulk-import - Import multiple leads from CSV/JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema for bulk import
const bulkImportSchema = z.object({
  leads: z.array(
    z.object({
      name: z.string().min(1),
      phone: z.string().min(10),
      email: z.string().email().optional().nullable(),
      network_id: z.number().optional().nullable(),
      site_id: z.number().optional().nullable(),
      campaign_id: z.number().optional().nullable(),
      status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected']).default('new'),
      source: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      country: z.string().default('TR'),
      product_interest: z.string().optional().nullable(),
      budget: z.number().optional().nullable(),
      network_cost: z.number().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
  ).min(1, 'At least one lead is required'),
  skip_duplicates: z.boolean().default(true),
  duplicate_check_field: z.enum(['phone', 'email']).default('phone'),
});

/**
 * POST /api/leads/bulk-import
 * Import multiple leads at once with duplicate checking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = bulkImportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { leads, skip_duplicates, duplicate_check_field } = validation.data;

    const results = {
      total: leads.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[],
      imported_leads: [] as any[],
    };

    // Process each lead
    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i];

      try {
        // Check for duplicates if enabled
        if (skip_duplicates) {
          const checkField = duplicate_check_field;
          const checkValue = checkField === 'phone' ? leadData.phone : leadData.email;

          if (checkValue) {
            const duplicateCheck = await db.query(
              `SELECT id FROM leads WHERE ${checkField} = $1 LIMIT 1`,
              [checkValue]
            );

            if (duplicateCheck.rows.length > 0) {
              results.skipped++;
              results.errors.push({
                index: i,
                lead: leadData,
                error: `Duplicate ${checkField}: ${checkValue}`,
              });
              continue;
            }
          }
        }

        // Generate lead_code
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const leadCode = `LD-${dateStr}-${randomNum}`;

        // Insert lead
        const result = await db.query(
          `INSERT INTO leads (
            lead_code, name, phone, email,
            network_id, site_id, campaign_id,
            status, source, city, country,
            product_interest, budget, network_cost,
            notes, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, CURRENT_TIMESTAMP
          ) RETURNING *`,
          [
            leadCode,
            leadData.name,
            leadData.phone,
            leadData.email || null,
            leadData.network_id || null,
            leadData.site_id || null,
            leadData.campaign_id || null,
            leadData.status || 'new',
            leadData.source || 'bulk_import',
            leadData.city || null,
            leadData.country || 'TR',
            leadData.product_interest || null,
            leadData.budget || null,
            leadData.network_cost || null,
            leadData.notes || null,
          ]
        );

        // Log activity
        await db.query(
          `INSERT INTO lead_activities (
            lead_id, activity_type, description, created_at
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [
            result.rows[0].id,
            'lead_created',
            `Lead created via bulk import: ${leadData.name}`,
          ]
        ).catch(() => {
          // Ignore activity log errors
        });

        results.imported++;
        results.imported_leads.push(result.rows[0]);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          index: i,
          lead: leadData,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Bulk import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`,
        results,
      },
      { status: results.imported > 0 ? 201 : 400 }
    );
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing bulk import',
      },
      { status: 500 }
    );
  }
}
