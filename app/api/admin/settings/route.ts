import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';

/**
 * GET /api/admin/settings
 * Get system settings
 * 
 * PUT /api/admin/settings
 * Update system settings
 */

const settingsSchema = z.object({
  company_name: z.string().optional(),
  company_email: z.string().email().optional(),
  company_phone: z.string().optional(),
  default_currency: z.string().optional().default('TRY'),
  default_timezone: z.string().optional().default('Europe/Istanbul'),
  leads_per_page: z.number().min(10).max(100).optional().default(20),
  session_timeout_minutes: z.number().min(15).max(1440).optional().default(60),
  enable_email_notifications: z.boolean().optional().default(true),
  enable_sms_notifications: z.boolean().optional().default(false),
  auto_assign_leads: z.boolean().optional().default(false),
  lead_duplicate_check_field: z.enum(['phone', 'email', 'both']).optional().default('phone'),
  default_lead_status: z.enum(['new', 'contacted', 'qualified']).optional().default('new'),
  webhook_retry_attempts: z.number().min(0).max(10).optional().default(3),
  max_export_rows: z.number().min(100).max(100000).optional().default(10000),
});

// GET - Get settings
export async function GET(request: NextRequest) {
  try {
    // Check if database connection is available (not during build)
    if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
      // Return default settings during build
      const defaultSettings = {
        company_name: 'DTekTracking',
        company_email: 'info@dtektracking.com',
        company_phone: '',
        default_currency: 'TRY',
        default_timezone: 'Europe/Istanbul',
        leads_per_page: 20,
        session_timeout_minutes: 60,
        enable_email_notifications: true,
        enable_sms_notifications: false,
        auto_assign_leads: false,
        lead_duplicate_check_field: 'phone',
        default_lead_status: 'new',
        webhook_retry_attempts: 3,
        max_export_rows: 10000,
      };

      return NextResponse.json({
        success: true,
        data: defaultSettings,
        note: 'Using default settings (database not available)',
      });
    }

    const result = await query(
      `SELECT * FROM system_settings ORDER BY id LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Return default settings if none exist
      const defaultSettings = {
        company_name: 'DTekTracking',
        company_email: 'info@dtektracking.com',
        company_phone: '',
        default_currency: 'TRY',
        default_timezone: 'Europe/Istanbul',
        leads_per_page: 20,
        session_timeout_minutes: 60,
        enable_email_notifications: true,
        enable_sms_notifications: false,
        auto_assign_leads: false,
        lead_duplicate_check_field: 'phone',
        default_lead_status: 'new',
        webhook_retry_attempts: 3,
        max_export_rows: 10000,
      };

      return NextResponse.json({
        success: true,
        data: defaultSettings,
        note: 'Using default settings (not saved in database)',
      });
    }

    const settings = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        // Parse JSON fields if stored as strings
        settings: typeof settings.settings === 'string' 
          ? JSON.parse(settings.settings) 
          : settings.settings,
      },
    });

  } catch (error: any) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    // Check if database connection is available (not during build)
    if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not configured'
      }, { status: 503 });
    }

    const body = await request.json();
    const settingsData = settingsSchema.parse(body);

    // Check if settings exist
    const existingSettings = await query(
      `SELECT id FROM system_settings LIMIT 1`
    );

    let result;

    if (existingSettings.rows.length === 0) {
      // Insert new settings
      result = await query(
        `INSERT INTO system_settings (settings, updated_at, created_at)
         VALUES ($1, NOW(), NOW())
         RETURNING *`,
        [JSON.stringify(settingsData)]
      );
    } else {
      // Update existing settings
      const settingsId = existingSettings.rows[0].id;
      result = await query(
        `UPDATE system_settings 
         SET settings = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(settingsData), settingsId]
      );
    }

    const updatedSettings = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        ...updatedSettings,
        settings: typeof updatedSettings.settings === 'string'
          ? JSON.parse(updatedSettings.settings)
          : updatedSettings.settings,
      },
    });

  } catch (error: any) {
    console.error('Update settings error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid settings data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
